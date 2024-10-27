import os

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


def main():

    log_file = open("message.log","w")
    
    print("running chatbot query")

    sys.stdout = log_file

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
    with open('ux/chatTranscript_'+user_id+'.json', 'w') as file:
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


    if user_input == "":
        return
        
    thread = client.beta.threads.create()
        
    # Create thread & populate with chat istory
    for msg in chat_history:
        # Skip empty messages
        if not msg["content"]:
            continue
            
        # Convert "Client Negotiator" role to "user", otherwise use "assistant"
        role = "user" if msg["role"] == "Client Negotiator" else "assistant"
        
        # Add message to thread
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role=role,
            content=msg["content"]
        )

    thread_id = thread.id
    print("CREATED THREAD ID: " + thread_id)
    
    # Prepare prompt
    prompt = prompt_template.replace("{instructions_prompt_file}", instructions_prompt_file) \
        .replace("{current_instructions_prompt}", instructions_prompt) \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{output_prompt_component}", output_prompt_component) \
        .replace("{planning_doc_data}", json.dumps(planning_doc_data)) \
        .replace("{special_notes}", special_notes)


    print("starting askgpt call")   
    log_file.close()
    log_file = open("message.log","a")
    sys.stdout = log_file
    
    print("PROMPT CONTENTS: " + prompt)

    # run user-response prompt
    import time
    start_time = time.time()
    content = ask_gpt(prompt, thread_id, session_id, user_id, instructions_prompt_file)
    end_time = time.time()
    execution_time = end_time - start_time
    print(f"run_fn() took {execution_time:.4f} seconds to run.")

    # print content
    print("CONTENT" + json.dumps(content))

    # update last prompt
    db.update_last_prompt(session_id, prompt)

    # update database with final response
    db.update_chat_history(session_id, {"role": "Negotiation Coach", "content": content['response_to_user']})

    # Update chat display with final response
    chat_history = db.get_chat_history(session_id)
    with open('ux/chatTranscript_'+user_id+'.json', 'r+') as file:
        file.seek(0)
        json.dump(chat_history, file)
        file.truncate()

    # update special notes
    try:
        db.update_special_notes(session_id, content['special_notes'])
    except (KeyError, TypeError) as e:
        print(f"Error updating special notes: {e}")
    

    # Handle action
    # def update_instructions_prompt_file(self, session_id, prompt_file):
    action = content['action']
    action_data = json.loads(content['action_data'])
    print("Action: " + action)
    if action in ["change_step","step_selection"] :
        print("CHANGING STEP TO " + action_data['step_selection'])
        db.update_instructions_prompt_file(session_id, action_data['step_selection'])

    print("Prompt File: " + db.get_instructions_prompt_file(session_id))

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

    db.update_data_state(session_id, new_data_state):

    print("end")
    log_file.close()
  
if __name__ == "__main__":
    main()
