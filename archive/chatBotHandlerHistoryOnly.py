import os
import json
import time
from openai import OpenAI

os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
# os.chdir("/root/planning-doc-chatbot")

my_key = open('key_to_gpt.txt','r').readline()
client = OpenAI(api_key=my_key)

def update_chat_transcript(message, is_initial=True):
    with open('ux/chatTranscript.json', 'r+') as file:
        chat_history = json.load(file)
        if is_initial:
            # Add a new message
            chat_history['messages'].append({"role": "Negotiation Coach", "content": message})
        else:
            # Replace the last message with the final response
            chat_history['messages'][-1] = {"role": "Negotiation Coach", "content": message}
        file.seek(0)
        json.dump(chat_history, file)
        file.truncate()

def ask_gpt(prompt: str):
    user_prompt = {
        "role": "user",
        "content": prompt
    }
    
    update_chat_transcript("Thinking", is_initial=True)
    
    stream = client.chat.completions.create(
        model="gpt-4-0125-preview",
        messages=[user_prompt],
        stream=True
    )

    full_response = ""
    dot_count = 0
    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            full_response += chunk.choices[0].delta.content
            dot_count += 1
            if dot_count % 5 == 0:  # Update every 5 chunks
                update_chat_transcript(f"Thinking{'.' * (dot_count // 5)}", is_initial=False)

    # Try to parse the full response as JSON
    try:
        content = json.loads(full_response)
    except json.JSONDecodeError:
        print("Error: Failed to parse the full response as JSON")
        content = {"response_to_user": full_response, "action": "", "data_state": {}}

    # Save content history
    with open("content_history.txt", "a") as f:
        f.write(json.dumps(content) + "\n\n###\n\n")
    
    return content

def update_data_state(data_state):
    with open("data_state.txt", "w") as f:
        json.dump(data_state, f)

def update_instructions_prompt_file(new_step):
    with open("instructionsPromptFile.txt", "w") as f:
        f.write(new_step)
    print("new_step: " + new_step)

def main():
    print("running chatbot query")


    ### load prompt template
    with open('prompt_template.txt', 'r') as file:
        prompt_template  = file.read()

    with open('data_state_instructions_subprompt.txt', 'r') as file:
        data_state_prompt_component  = file.read()

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
    # chat_history.append({"role": "Client Negotiator", "content": user_input})

    # # save chat history to file
    # f = open("ux/chatTranscript.json", "w")
    # f.write(json.dumps({"messages": chat_history}))
    # f.close()

    # print("Received user input.")

    # # clear user input
    # f = open("ux/user-input.txt", "w")
    # f.write(" ")
    # f.close()
    

    # Prepare prompt
    prompt = prompt_template.replace("{instructions_prompt_file}", instructions_prompt_file) \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history)) \
        .replace("{data_state_prompt_component}", data_state_prompt_component) \
        .replace("{output_prompt_component}", output_prompt_component) \
        .replace("{current_instructions_prompt}", instructions_prompt) \
        .replace("{planning_doc_data}", json.dumps(planning_doc_data))

    with open("last_prompt.txt", "w") as f:
        f.write(prompt)

    # update_chat_transcript("Starting to process your request...", is_initial=True)
    time.sleep(1)  # Small delay to ensure the message is displayed

    content = ask_gpt(prompt)

    # Update chat transcript with final response
    update_chat_transcript(content['response_to_user'], is_initial=False)

    # Update data state
    update_data_state(content['data_state'])

    # Handle action
    action = content['action']
    print("Action: " + action)
    if action == "change_step":
        update_instructions_prompt_file(content['action_data']['step_selection'])

if __name__ == "__main__":
    main()