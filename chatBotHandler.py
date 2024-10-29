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

    print("Session ID: " + session_id)
 
    ### load prompt templates
    with open('prompts/prompt_template.txt', 'r') as file:
        prompt_template = file.read()
        
    with open('prompts/output_prompt.txt', 'r') as file:
        output_prompt_component = file.read()

    # update chat history with user input
    db.update_chat_history(session_id, {"role": "Client Negotiator", "content": user_input})

    print("User input: " + user_input)
    
    # update chat display with user input
    chat_history = db.get_chat_history(session_id)
    with open('ux/userdata/chatTranscript_'+user_id+'.json', 'w') as file:
        json.dump(chat_history, file)

    print("Chat display updated")

    ### load planning doc data
    ### NEEDS UPDATING!!! not on the database.
    planning_doc_data = db.load_planning_doc_data(user_id) #TBD <- session_id
    
    ### load special notes
    special_notes = db.get_special_notes(session_id)
        
    ### load instructions prompt
    instructions_prompt_file = db.get_instructions_prompt_file(session_id)


    ### load instructions prompt
    with open(("prompts/"+instructions_prompt_file+".txt"), 'r') as file:
        instructions_prompt = file.read()

    print("PROMPT: " + instructions_prompt_file)

    data_state = db.get_data_state(session_id)
    
    # use current thread_id to get a proper thread_id, and set it in the db, and return the value
    # thread_id = db.get_thread_id(session_id)

        
    # use current thread_id to get a proper thread_id, and set it in the db, and return the value
    thread_id = db.get_thread_id(session_id)


    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=user_input
    )

    # messages = client.beta.threads.messages.list(thread_id=thread_id)
    # for msg in messages:
    #     print(f"\nRole: {msg.role}")
    #     print(f"Content: {msg.content[0].text.value}")        

    # Prepare prompt
    prompt = prompt_template.replace("{instructions_prompt_file}", instructions_prompt_file) \
        .replace("{current_instructions_prompt}", instructions_prompt) \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{output_prompt_component}", output_prompt_component) \
        .replace("{planning_doc_data}", json.dumps(planning_doc_data)) \
        .replace("{special_notes}", special_notes)


    print("starting askgpt call")   
    
    
    #########################################
    # run strategy prompt   
    strategy_content = ask_gpt_strategy(prompt, thread_id, session_id, user_id, instructions_prompt_file)

    
    #########################################
    # ask GPT to calculate final response         
    chat_history = db.get_chat_history(session_id)
    coach_response = ask_gpt_response(prompt, thread_id, session_id, user_id, instructions_prompt_file, chat_history)

    # update database with final response
    db.update_chat_history(session_id, {"role": "Negotiation Coach", "content": coach_response})

    # Update chat display with final response
    chat_history = db.get_chat_history(session_id)
    with open('ux/userdata/chatTranscript_'+user_id+'.json', 'r+') as file:
        file.seek(0)
        json.dump(chat_history, file)
        file.truncate()

    # update special notes
    try:
        db.update_special_notes(session_id, strategy_content['special_notes'])
    except (KeyError, TypeError) as e:
        print(f"Error updating special notes: {e}")
    
    #########################################
    # Handle action from strategy if appropriate
    # def update_instructions_prompt_file(self, session_id, prompt_file):
    action = strategy_content['action']
    action_data = strategy_content['action_data']
    print("Action: " + action)
    print("Action_data: " + json.dumps(action_data))
    if action in ["change_step","step_selection"] :
        print("CHANGING STEP TO " + action_data['step_selection'])
        db.update_instructions_prompt_file(session_id, action_data['step_selection'])


    #########################################
    ##### RUN GPT QUERY TO UPDATE DATA STATE
    with open("prompts/datastate_extractor_prompt_template.txt", 'r') as file:
        notes_prompt_template = file.read()
    # Prepare prompt
    notes_prompt = notes_prompt_template.replace("{instructions_prompt_file}", instructions_prompt_file) \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history)) \
        .replace("{output_prompt_component}", output_prompt_component) \
        .replace("{current_instructions_prompt}", instructions_prompt) \
        .replace("{planning_doc_data}", json.dumps(planning_doc_data)) \
        .replace("{special_notes}", special_notes)

    new_data_state = ask_gpt_data(notes_prompt)

    db.update_data_state(session_id, new_data_state)


    #########################################
    ### CLEAN UP
    tee.close()
  
if __name__ == "__main__":
    main()
