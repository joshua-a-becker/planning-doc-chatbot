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
user_session_id = sys.argv[2]
user_input = sys.argv[3]

print("User: " + user_id)



class TeeStream:
    """Stream wrapper that writes to both file and stdout."""
    def __init__(self, filename):
        self.file = open(filename, 'w')  # Start with write mode to clear file
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
    tee = TeeStream("message.log")
    sys.stdout = tee

    print("running chatbot query")
    
    

    session_id = db.get_session_id_for_user(user_id)


    # update chat history with user input
    db.update_chat_history(session_id, {"role": "Client Negotiator", "content": user_input})

    # update chat display with user input
    chat_history = db.get_chat_history(session_id)
    with open('ux/userdata/chatTranscript_'+user_id+'.json', 'w') as file:
        json.dump(chat_history, file)

    ### load planning doc data
    planning_doc_data = db.load_planning_doc_data(user_id) #TBD <- session_id
    
    ### load special notes
    special_notes = db.get_special_notes(session_id)


    # get notes data state
    data_state = db.get_data_state(session_id)
        
    
    #####################
    # run strategy prompt 
    #####################
    
    strategy_prompt_file = db.get_instructions_prompt_file(session_id)

    print("PROMPT: " + strategy_prompt_file)

    with open(("prompts/"+strategy_prompt_file+".txt"), 'r') as file:
        strategy_prompt = file.read()
    with open('prompts/strategy_prompt_template.txt', 'r') as file:
        strategy_prompt_template = file.read()
    with open('prompts/strategy_output_prompt.txt', 'r') as file:
        strategy_output_prompt_component = file.read()

    
    strategy_prompt = strategy_prompt_template.replace("{instructions_prompt_file}", strategy_prompt_file) \
        .replace("{current_instructions_prompt}", strategy_prompt) \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{output_prompt_component}", strategy_output_prompt_component) \
        .replace("{planning_doc_data}", json.dumps(planning_doc_data)) \
        .replace("{special_notes}", special_notes)


    strategy_content = ask_gpt_strategy(strategy_prompt, json.dumps(chat_history), session_id, user_id)
    strategy_content_txt = json.dumps(strategy_content)

    # print("Strategy prompt: " + strategy_prompt)
    # print("Strategy content: " + strategy_content_txt)
    
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
    with open('prompts/coach_response_prompt_template.txt', 'r') as file:
        coach_response_prompt_template = file.read()

    coach_response_prompt = coach_response_prompt_template \
        .replace("{strategy_output}", strategy_content_txt)

    print("COACHING REPONSE PROMPT:\n")
    print(coach_response_prompt)
    print("####################")

    coach_response = ask_gpt_response(coach_response_prompt, thread_id, user_id, chat_history)

    # update database with final response
    db.update_chat_history(session_id, {"role": "Negotiation Coach", "content": coach_response})

    ##################################
    ##### PROCESS COACH RESPONSE #####
    ##################################

    try:
        db.update_special_notes(session_id, strategy_content['special_notes'])
    except (KeyError, TypeError) as e:
        print(f"Error updating special notes: {e}")
    
    ############################################
    # Handle action from strategy if appropriate
    ############################################

    
    action = strategy_content['action']
    action_data = json.loads(strategy_content['action_data'])
    print("Action: " + action)
    print("Action_data: " + json.dumps(action_data))
    if action in ["change_step","step_selection","next_step"] :
        # print(action_data.keys)
        print("CHANGING STEP TO " + action_data['step_selection'])
        db.update_instructions_prompt_file(session_id, action_data['step_selection'])


    ############################################
    ##### RUN GPT QUERY TO UPDATE DATA STATE ###
    ############################################

    with open("prompts/datastate_extractor_prompt_template.txt", 'r') as file:
        notes_prompt_template = file.read()
    # Prepare prompt
    notes_prompt = notes_prompt_template.replace("{instructions_prompt_file}", strategy_prompt_file) \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history)) \
        .replace("{current_instructions_prompt}", strategy_prompt) \
        .replace("{planning_doc_data}", json.dumps(planning_doc_data)) \
        .replace("{special_notes}", special_notes)

    new_data_state = ask_gpt_data(notes_prompt)

    db.update_data_state(session_id, new_data_state)


    ################
    ### CLEAN UP ###
    ################
    tee.close()
  
if __name__ == "__main__":
    main()
