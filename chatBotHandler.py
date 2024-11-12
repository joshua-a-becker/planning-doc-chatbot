import os
import time
localdir = open('../localdir.txt', 'r').read()
os.chdir(localdir)

import sys
from askGpt import *
from db_handler import db
import json

print("startup chatbothandler")




user_id = sys.argv[1]
print("User: " + user_id)
user_session_id = sys.argv[2]
user_input = sys.argv[3]





class TeeStream:
    """Stream wrapper that writes to both file and stdout."""
    def __init__(self, filename):
        self.file = open(filename, 'a')  # Start with write mode to clear file
        self.stdout = sys.stdout
    
    def write(self, data):
        self.file.write(data)
        self.stdout.write(data)
        # Flush after each write to see updates immediately
        self.file.flush()
        self.stdout.flush()
    
    def flush(self):
        try:
            self.file.flush()
            self.stdout.flush()
        except ValueError:  # Handle already closed file
            pass

        self.stdout.flush()
    
    def close(self):
        self.file.close()


def main():

    

    # only run with user input
    if user_input == "":
        return

    # Set up output redirection at the start
    tee = TeeStream("./logs/logs_"+user_id+".log")
    sys.stdout = tee

    print("user input: " + user_input)



    test_structured_output()
    print("running chatbot query")
    
    

    session_id = db.get_session_id_for_user(user_id)


    print("line 72")

    # update chat history with user input
    print("USER ID: " + user_id)
    print("USER NAME: " + db.get_user_name(user_id))
    db.update_chat_history(session_id, {"role": db.get_user_name(user_id), "content": user_input})

    print("line 77")

    # update chat display with user input
    chat_history = db.get_chat_history(session_id)
    with open('ux/userdata/chatTranscript_'+user_id+'.json', 'w') as file:
        json.dump(chat_history, file)

    print("display updated")

    ### load planning doc data
    planning_doc_data = db.load_planning_doc_data(user_id) #TBD <- session_id
    
    ### load special notes
    special_notes = db.get_special_notes(session_id)


    # get notes data state
    data_state = db.get_data_state(session_id)
        
    
    #####################
    # run strategy prompt 
    #####################
    instructions_step = db.get_instructions_prompt_file(session_id)
    strategy_prompt_file = "strategy_" + instructions_step

    print("PROMPT: " + strategy_prompt_file)

    with open(("prompts/"+strategy_prompt_file+".txt"), 'r') as file:
        strategy_prompt = file.read(). \
        replace("{planning_doc}", json.dumps(planning_doc_data))
    
    with open(("prompts/strategy_intro.txt"), 'r') as file:
            strategy_intro = file.read()

    with open(("prompts/strategy_skills_trainer.txt"), 'r') as file:
            strategy_skills_trainer = file.read()

    with open(("prompts/technical_administrator.txt"), 'r') as file:
            technical_administrator = file.read()


    # strategy_prompt = strategy_prompt_template.replace("{instructions_prompt_file}", strategy_prompt_file) \
    #     .replace("{current_instructions_prompt}", strategy_prompt) \
    #     .replace("{output_prompt_component}", strategy_output_prompt_component) \
    #     .replace("{planning_doc_data}", json.dumps(planning_doc_data)) \
    #     .replace("{special_notes}", special_notes)

    advice_note = """
    If a user asks for advice, you will inform them:  
    
    "This process is based on facilitative coaching, which guides you to determine your own strategy.  As a general rule I do not give advice as a coach.  Notably, a future version of this app will include the ability to give stanrd best-practice guidelines such as how to pick a strong first offer.  However, giving advice is tricky business for anybody in a position of influence-which brings responsibility-and so we will be implementing that feature very carefully."

    And then you will redirect the conversation back to the topic at hand as per strategy.
    """

    strategy_messages = [
        {"role": "system", "name": "instructor_general_instructions", "content": strategy_intro},
        {"role": "system", "name": "self_current_step", "content": "CURRENT STEP " + strategy_prompt_file},
        {"role": "user", "name": "self_conversation_history", "content" : str(chat_history)},
        {"role": "user", "name": "user_planning_doc", "content" : str(planning_doc_data)},
        {"role": "system", "name": "self_notes_so_far", "content": str(data_state)},
        {"role": "system", "name": "instructor_skills_trainer", "content": str(strategy_skills_trainer)},
        {"role": "system", "name": "instructor_skills_trainer", "content": str(advice_note)},
        {"role": "system", "name": "instructor_instructions", "content": str(strategy_prompt)},
        {"role": "system", "name": "instructor_technical_administrator", "content": str(technical_administrator)}
    ]

    strategy_content = ask_gpt_strategy(strategy_messages, session_id, user_id)
    strategy_content_txt = json.dumps(strategy_content)

    # print("Strategy prompt: " + strategy_prompt)
    print("#####\nStrategy content: \n\n" + strategy_content_txt + "\n\n ######")
    



    #######################################
    # ask GPT to determine response to user
    #######################################

    # add user input to thread
    thread_id = db.get_thread_id(session_id)
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=user_input
    )

    # load prompt content
    with open('prompts/coach_response_intro.txt', 'r') as file:
        coach_response_intro = file.read()

    with open('prompts/coach_response_instructions.txt', 'r') as file:
        coach_response_instructions = file.read(). \
            replace("{strategy_output}", strategy_content_txt). \
            replace("{instructions_prompt_file}", instructions_step). \
            replace("{planning_doc}", str(planning_doc_data))


    with open('prompts/coach_response_skills_training.txt', 'r') as file:
        coach_response_skills_training = file.read()

    all_messages = []
    for message in chat_history:
        role = "assistant" if message['role']=="Negotiation Coach" else "user"
        content=message['content']
        all_messages.append({'role':role, 'content':content})
    

    coach_response_prompt_messages = []
    coach_response_prompt_messages.extend([{"role":"system", "content" : coach_response_intro}])
    coach_response_prompt_messages.extend([{"role":"system", "content" : coach_response_skills_training}])
    coach_response_prompt_messages.extend(all_messages)
    coach_response_prompt_messages.extend([{"role": "system", "content" : coach_response_instructions}])

    coach_response = ask_gpt_response(coach_response_prompt_messages, thread_id, user_id, chat_history)

    # update database with final response
    db.update_chat_history(session_id, {"role": "Negotiation Coach", "content": coach_response})


    db.update_instructions_prompt_file(session_id, strategy_content['next_step'])

    print("Response: " + str(coach_response))

    ############################################
    ##### RUN GPT QUERY TO UPDATE DATA STATE ###
    ############################################

    with open("prompts/notes_prompt_template.txt", 'r') as file:
        notes_prompt_template = file.read()

    with open("prompts/notes_prompt_header.txt", 'r') as file:
        notes_prompt_header = file.read()
    # Prepare prompt
    notes_prompt = notes_prompt_template.replace("{instructions_prompt_file}", instructions_step) \
        .replace("{current_data_state}", str(data_state)) \
        .replace("{conversation_thread}", str(chat_history))

    notes_messages=[
        {"role":"system", "name":"header","content":notes_prompt_header},
        {"role":"user", "name":"conversation_history","content":str(chat_history)},
        {"role":"system", "name":"current_data_state","content":str(data_state)},
        {"role":"system", "name":"instructions","content":notes_prompt},
        
    ]

    new_data_state = ask_gpt_data(notes_messages)

    print("New Data State: " + str(new_data_state))

    db.update_data_state(session_id, new_data_state)


    ################
    ### CLEAN UP ###
    ################
    tee.close()
  
if __name__ == "__main__":
    main()
