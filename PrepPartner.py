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
f = open("content_history.txt", "w")
f.write("")
f.close()



def ask_gpt(prompt: str):
    global content
    global response
    global data_state
    user_prompt =  {
                "role": "user",
                "content": prompt
            }
    
    completion = client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            user_prompt
        ]
    )
    content = completion.choices[0].message.content
    content = json.loads(content)

    f = open("content_history.txt", "a")
    f.write(json.dumps(content)+"\n\n###\n\n")
    f.close()


    response = content['response_to_user']
    chat_history.append({"role": "Negotiation Coach", "content": response})
    data_state = json.dumps(content['data_state'])
    


content=""
response=""
chat_history = [ ]


def main():
    system('clear')
    global content
    global response
    global chat_history
    global data_state
    
    f = open("chat_history.txt", "w")
    f.write(json.dumps(chat_history))
    f.close()

    f = open("data_state.txt", "w")
    f.write(json.dumps(data_state))
    f.close()

    user_input=""
    while user_input != "quit":

        ### allow live editing of prompt
        with open('prompt_template.txt', 'r') as file:
            prompt_template  = file.read()

        prompt = prompt_template.replace("current_data_state", data_state).replace("conversation_thread",json.dumps(chat_history))
        ask_gpt(prompt)
        #print(json.dumps(data_state))
        f = open("data_state.txt", "w")
        f.write(json.dumps(data_state))
        f.close()
        
        #print(json.dumps(chat_history))
        print("\nCoach: " + response)
        user_input = input("\nYou : ")
        chat_history.append({"role": "Client Negotiator", "content": user_input})

        f = open("chat_history.txt", "w")
        f.write(json.dumps(chat_history))
        f.close()

    print("Program terminated!")

if __name__ == "__main__":
    main()