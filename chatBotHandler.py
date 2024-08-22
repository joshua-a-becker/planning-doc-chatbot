import os
os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")

from openai import OpenAI
import json
from os import system, name
my_key = open('key_to_gpt.txt','r').readline()
with open('prompt_template.txt', 'r') as file:
    prompt_template  = file.read()

client = OpenAI(api_key=my_key)

data_state = """
{
    "expansive_topics" : { }, 
    "narrow_topics": []
}
"""

def ask_gpt(prompt: str):
    user_prompt =  {
                "role": "user",
                "content": prompt
            }
    
    completion = client.chat.completions.create(
        #model="gpt-4o",
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            user_prompt
        ]
    )

    content = json.loads(completion.choices[0].message.content)

    response = content['response_to_user']

    # extract data state
    data_state = json.dumps(content['data_state'])

    print(content['action'])

    # save data state to file
    f = open("data_state.txt", "w")
    f.write(json.dumps(data_state))
    f.close()

    return response
    


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
    
    
    
    # update chat history
    chat_history.append({"role": "Client Negotiator", "content": user_input})
    print("user input: " + user_input)

    # save chat history to file
    f = open("ux/chatTranscript.json", "w")
    f.write(json.dumps({"messages": chat_history}))
    f.close()

    ### get chat history with new user input into prompt    
    prompt = prompt_template. \
        replace("{current_data_state}", data_state). \
        replace("{conversation_thread}",json.dumps(chat_history)). \
        replace("{data_state_prompt_component}", data_state_prompt_component). \
        replace("{output_prompt_component}", output_prompt_component)
    
    response = ask_gpt(prompt)


    # update chat history
    chat_history.append({"role": "Negotiation Coach", "content": response})
    
    # save chat history to file
    f = open("ux/chatTranscript.json", "w")
    f.write(json.dumps({"messages": chat_history}))
    f.close()
    
    # clear user input
    f = open("ux/user-input.txt", "w")
    f.write(" ")
    f.close()
    

    print("Program terminated!")

if __name__ == "__main__":
    main()