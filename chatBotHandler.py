from askGpt import *


def update_data_state(data_state):
    # Write the updated state back to the file
    with open("data_state.txt", "w") as f:
        json.dump(data_state, f, indent=2)


def update_instructions_prompt_file(new_step):
    with open("instructionsPromptFile.txt", "w") as f:
        f.write(new_step)
    print("new_step: " + new_step)

def main():
    print("running chatbot query")


    ### load prompt templates
    with open('prompt_template.txt', 'r') as file:
        prompt_template  = file.read()

    with open('output_prompt.txt', 'r') as file:
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
    
    
    ### load instructions prompt file
    with open("instructionsPromptFile.txt", 'r') as file:
        instructions_prompt_file = file.read()

    print(instructions_prompt_file)

    ### load instructions prompt
    with open((instructions_prompt_file+".txt"), 'r') as file:
        instructions_prompt = file.read()

    
    


    if(os.path.isfile("data_state.txt")) :
        with open('data_state.txt', 'r') as file:
            data_state = json.load(file)
    else: 
        with open('data_state_blank.txt', 'r') as file:
            data_state = json.load(file)
        
    
    # update chat history
    chat_history.append({"role": "Client Negotiator", "content": user_input})

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
        .replace("{planning_doc_data}", json.dumps(planning_doc_data))

    with open("last_prompt.txt", "w") as f:
        f.write(prompt)


    # run user-response prompt
    import time
    start_time = time.time()
    content = ask_gpt(prompt)
    end_time = time.time()
    execution_time = end_time - start_time
    print(f"run_fn() took {execution_time:.4f} seconds to run.")

    print(content)

    # Update chat transcript with final response
    update_chat_transcript(content['response_to_user'], is_initial=False)

    # Prepare data_state prompt
    with open('datastate_extractor_prompt_template.txt', 'r') as file:
        datastate_prompt_template  = file.read()


    data_state_prompt = datastate_prompt_template \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history))

    with open("last_datastate_prompt.txt", "w") as f:
        f.write(data_state_prompt)

    # run data state prompt
    data_state = ask_gpt_data(data_state_prompt)

    
    # Update data state
    update_data_state(data_state)

    # Handle action
    action = content['action']
    print("Action: " + action)
    if action == "change_step":
        update_instructions_prompt_file(content['action_data']['step_selection'])

if __name__ == "__main__":
    main()