import os
from openai import OpenAI
import json

os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
# os.chdir("/root/planning-doc-chatbot")

my_key = open('key_to_gpt.txt','r').readline()
client = OpenAI(api_key=my_key)



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
            if dot_count % 10 == 0:  # Update every 10 chunks
                update_chat_transcript(f"Thinking{'. ' * (dot_count // 5)}", is_initial=False)

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

def ask_gpt_data(prompt: str):
    user_prompt = {
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

    # content = json.loads(completion.choices[0].message.content)
    content = completion.choices[0].message.content

    return content



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