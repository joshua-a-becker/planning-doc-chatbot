import time
import os
from openai import OpenAI
import json

os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
# os.chdir("/root/planning-doc-chatbot")

my_key = open('key_to_gpt.txt','r').readline()
client = OpenAI(api_key=my_key)


def get_or_create_thread(db_thread_id, message_history):
    if db_thread_id!='':
        return db_thread_id
    else:
        thread = client.beta.threads.create()

        # Populate the thread with existing messages        
        for message in message_history:
            if message["content"] == "":
                continue 
            client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user" if message["role"] == "Client Negotiator" else "assistant",
                content=message["content"]
            )
        return thread.id



def ask_gpt(instructions_prompt, thread_id, session_id, user_id, current_step):
    # Create or retrieve the assistant
    assistant = client.beta.assistants.create(
        name="Negotiation Coach",
        instructions=instructions_prompt,
        model="gpt-4-0125-preview"
    )
    
    # Run the assistant
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant.id
    )

    # Stream the response
    update_chat_display("Thinking", user_id, is_initial=True)
    dot_count = 0
    while run.status != "completed":
        run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
        if run.status == "in_progress":
            dot_count += 1
            update_chat_display(f"Thinking{'. ' * (dot_count // 1)}", user_id, is_initial=False)

    
    full_response = client.beta.threads.messages.list(thread_id=thread_id, order="desc", limit=1).data[0].content[0].text.value
    
    # print("FULL RESPONSE") 
    # print(full_response)

    # Try to parse the full response as JSON
    try:
        content = json.loads(full_response)
    except json.JSONDecodeError:
        print("Error: Failed to parse the full response as JSON")
        content = {"response_to_user": full_response, "action": "", "data_state": {}}

        
    with open("storage/content_history.txt", "a") as f:
        f.write("current step: " + current_step + "\n\n" +json.dumps(content) + "\n\n###\n\n")
    
    with open("storage/last_content.txt", "w") as f:
        f.write(json.dumps(content))

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



def update_chat_display(message, user_id, is_initial=True):
    with open('ux/chatTranscript_'+user_id+'.json', 'r+') as file:
        chat_history = json.load(file)
        
    if is_initial:
        # Add a new message
        chat_history.append({"role": "Negotiation Coach", "content": message})
    else:
        # Replace the last message with the final response
        chat_history[-1] = {"role": "Negotiation Coach", "content": message}
    
    with open('ux/chatTranscript_'+user_id+'.json', 'r+') as file:
        file.seek(0)
        json.dump(chat_history, file)
        file.truncate()


