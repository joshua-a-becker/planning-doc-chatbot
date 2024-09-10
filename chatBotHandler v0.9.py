import os
os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
# os.chdir("/root/planning-doc-chatbot")

from openai import OpenAI
import json
from os import system, name
my_key = open('key_to_gpt.txt','r').readline()
with open('prompt_template.txt', 'r') as file:
    prompt_template  = file.read()

client = OpenAI(api_key=my_key)


def ask_gpt(prompt: str):
    user_prompt =  {
                "role": "user",
                "content": prompt
            }
    
    completion = client.chat.completions.create(
        model="gpt-4o",
        # model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            user_prompt
        ]
    )

    content = json.loads(completion.choices[0].message.content)

    # save content history
    f = open("content_history.txt", "a")
    f.write(json.dumps(content)+"\n\n###\n\n")
    f.close()
    
    # return response
    return content
    


def main():
    print("running chatbot query")

    ### load prompt template
    with open('prompt_template.txt', 'r') as file:
        prompt_template  = file.read()

    with open('data_state_prompt.txt', 'r') as file:
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
        plannign_doc_data = json.load(file)
    
    
    ### load instructions prompt file
    with open("instructionsPromptFile.txt", 'r') as file:
        instructions_prompt_file = file.read()

    print(instructions_prompt_file)

    ### load instructions prompt
    with open((instructions_prompt_file+".txt"), 'r') as file:
        instrutions_prompt = file.read()

    
    


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
    

    ### get chat history with new user input into prompt    
    prompt = prompt_template. \
        replace("{instructions_prompt_file}", instructions_prompt_file). \
        replace("{current_data_state}", json.dumps(data_state)). \
        replace("{conversation_thread}",json.dumps(chat_history)). \
        replace("{data_state_prompt_component}", data_state_prompt_component). \
        replace("{output_prompt_component}", output_prompt_component). \
        replace("{current_instructions_prompt}", instrutions_prompt). \
        replace("{planning_doc_data}", json.dumps(plannign_doc_data))
        
    f = open("last_prompt.txt", "w")
    f.write(prompt)
    f.close()

    content = ask_gpt(prompt)

    # extract response
    response = content['response_to_user']

    # exctract action
    action = content['action']

    # extract data state
    data_state = json.dumps(content['data_state'])

    # display action
    print("Action: " + action)

    # save data state to file
    f = open("data_state.txt", "w")
    f.write(json.dumps(data_state))
    f.close()

    # update chat history
    chat_history.append({"role": "Negotiation Coach", "content": response})
    
    # save chat history to file
    f = open("ux/chatTranscript.json", "w")
    f.write(json.dumps({"messages": chat_history}))
    f.close()

    if(action=="change_step"): 
        new_step = content['action_data']['step_selection']
        # update instructions prompt file
        f = open("instructionsPromptFile.txt", "w")
        f.write(new_step)
        f.close()

        print("new_step: "+new_step)



if __name__ == "__main__":
    main()