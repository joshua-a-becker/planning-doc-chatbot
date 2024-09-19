from askGpt import *




def update_instructions_prompt_file(new_step):
    with open("storage/instructionsPromptFile.txt", "w") as f:
        f.write(new_step)
    print("new_step: " + new_step)


def update_special_notes(special_notes_text):
    with open("storage/special_notes.txt", "w") as f:
        f.write(special_notes_text)

def main():
    print("running chatbot query")


    ### load prompt templates
    with open('prompts/prompt_template.txt', 'r') as file:
        prompt_template  = file.read()

    with open('prompts/output_prompt.txt', 'r') as file:
        output_prompt_component  = file.read()


    ### load user input
    with open('ux/user-input.txt', 'r') as file:
        user_input  = file.read()

    ### load chat history
    with open('ux/chatTranscript.json', 'r') as file:
        chat_history = json.load(file)['messages']

    ### load planning doc data
    with open('ux/formData.json', 'r') as file:
        planning_doc_data = json.load(file)
    
    ### load special notes file
    if(os.path.isfile("storage/special_notes.txt")) :
        with open('storage/special_notes.txt', 'r') as file:
            special_notes = file.read()
    else : 
        special_notes = ""
        
    ### load instructions prompt file
    with open("storage/instructionsPromptFile.txt", 'r') as file:
        instructions_prompt_file = file.read()

    print(instructions_prompt_file)

    ### load instructions prompt
    with open(("prompts/"+instructions_prompt_file+".txt"), 'r') as file:
        instructions_prompt = file.read()

    if(os.path.isfile("storage/data_state.txt")) :
        with open('storage/data_state.txt', 'r') as file:
            data_state = json.load(file)
    else: 
        with open('storage/data_state_blank.txt', 'r') as file:
            data_state = json.load(file)
        
    
    # update chat history
    chat_history.append({"role": "Client Negotiator", "content": user_input})

    # update message to thread history
    thread_id = get_or_create_thread()
    if user_input!="": 
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=user_input
        )

    # save chat history to file
    f = open("ux/chatTranscript.json", "w")
    f.write(json.dumps({"messages": chat_history}))
    f.close()

    print("Received user input.")

    # clear user input
    f = open("ux/user-input.txt", "w")
    f.write(" ")
    f.close()
    

    # Prepare prompt
    prompt = prompt_template.replace("{instructions_prompt_file}", instructions_prompt_file) \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history)) \
        .replace("{output_prompt_component}", output_prompt_component) \
        .replace("{current_instructions_prompt}", instructions_prompt) \
        .replace("{planning_doc_data}", json.dumps(planning_doc_data)) \
        .replace("{special_notes}", special_notes)

    with open("storage/last_prompt.txt", "w") as f:
        f.write(prompt)


    # run user-response prompt
    import time
    start_time = time.time()
    content = ask_gpt(prompt, thread_id)
    end_time = time.time()
    execution_time = end_time - start_time
    print(f"run_fn() took {execution_time:.4f} seconds to run.")

    # print(content)

    # Update chat transcript with final response
    update_chat_transcript(content['response_to_user'], is_initial=False)

    # update special notes
    update_special_notes(content['special_notes'])

    # Prepare data_state prompt
    with open('prompts/datastate_extractor_prompt_template.txt', 'r') as file:
        datastate_prompt_template  = file.read()


    datastate_prompt = datastate_prompt_template \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history))

    with open("storage/last_datastate_prompt.txt", "w") as f:
        f.write(datastate_prompt)

    # run data state prompt
    data_state = ask_gpt_data(datastate_prompt)

    
    # Write the updated state back to the file
    with open("storage/data_state.txt", "w") as f:
        json.dump(data_state, f, indent=2)

    # Handle action
    action = content['action']
    print("Action: " + action)
    if action == "terminate_program":
        print("terminating program")
        exit("'terminate program' instructed by gpt")

    if action == "change_step":

        new_step = content['action_data']['step_selection']
        if(new_step)=="terminate_program":
            print("terminating program")
            exit("'terminate program' instructed by gpt")
        update_instructions_prompt_file(new_step)

if __name__ == "__main__":
    main()