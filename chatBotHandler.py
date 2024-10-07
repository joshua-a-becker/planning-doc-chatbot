from askGpt import *
from db_handler import db

def main():
    print("running chatbot query")

    ### load prompt templates
    with open('prompts/prompt_template.txt', 'r') as file:
        prompt_template = file.read()

    with open('prompts/output_prompt.txt', 'r') as file:
        output_prompt_component = file.read()

    ### load user input
    with open('ux/user-input.txt', 'r') as file:
        user_input = file.read()

    ### load chat history
    chat_history = db.get_chat_history()

    ### load planning doc data
    planning_doc_data = db.load_planning_doc_data()
    
    ### load special notes
    special_notes = db.get_special_notes()
        
    ### load instructions prompt
    instructions_prompt_file = db.get_instructions_prompt_file()

    print(instructions_prompt_file)

    ### load instructions prompt
    with open(("prompts/"+instructions_prompt_file+".txt"), 'r') as file:
        instructions_prompt = file.read()

    data_state = db.get_data_state()
    
    # use current thread_id to get a proper thread_id, and set it in the db, and return the value
    thread_id = db.set_thread_id(get_or_create_thread(db.get_thread_id(), chat_history))

    # update chat history with user input
    db.update_chat_history({"role": "Client Negotiator", "content": user_input})

    # update chat display with user input
    chat_history = db.get_chat_history()
    with open('ux/chatTranscript.json', 'w') as file:
        json.dump(chat_history, file)


    if user_input != "":
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=user_input
        )

    # clear user input
    with open("ux/user-input.txt", "w") as f:
        f.write("")

    # Prepare prompt
    prompt = prompt_template.replace("{instructions_prompt_file}", instructions_prompt_file) \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history)) \
        .replace("{output_prompt_component}", output_prompt_component) \
        .replace("{current_instructions_prompt}", instructions_prompt) \
        .replace("{planning_doc_data}", json.dumps(planning_doc_data)) \
        .replace("{special_notes}", special_notes)

    db.update_last_prompt(prompt)

    # run user-response prompt
    import time
    start_time = time.time()
    content = ask_gpt(prompt, thread_id, instructions_prompt_file)
    end_time = time.time()
    execution_time = end_time - start_time
    print(f"run_fn() took {execution_time:.4f} seconds to run.")

    # update database with final response
    db.update_chat_history({"role": "Negotiation Coach", "content": content['response_to_user']})

    # Update chat display with final response
    chat_history = db.get_chat_history()
    with open('ux/chatTranscript.json', 'r+') as file:
        file.seek(0)
        json.dump(chat_history, file)
        file.truncate()


    # update special notes
    db.update_special_notes(content['special_notes'])

    # Prepare data_state prompt
    with open('prompts/datastate_extractor_prompt_template.txt', 'r') as file:
        datastate_prompt_template = file.read()

    datastate_prompt = datastate_prompt_template \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history))

    with open("storage/last_datastate_prompt.txt", "w") as f:
        f.write(datastate_prompt)

    # run data state prompt
    data_state = ask_gpt_data(datastate_prompt)

    # Write the updated state back to the database
    db.update_data_state(data_state)

    # Handle action
    action = content['action']
    print("Action: " + action)
    if action == "terminate_program":
        print("terminating program")
        exit("'terminate program' instructed by gpt")

    if action == "change_step":
        new_step = content['action_data']['step_selection']
        if new_step == "terminate_program":
            print("terminating program")
            exit("'terminate program' instructed by gpt")
        db.update_instructions_prompt_file(new_step)

if __name__ == "__main__":
    main()
