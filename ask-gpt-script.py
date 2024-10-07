import time
import os
from openai import OpenAI
import json

os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
# os.chdir("/root/planning-doc-chatbot")

my_key = open('key_to_gpt.txt','r').readline()
client = OpenAI(api_key=my_key)

def get_or_create_thread(thread_id, message_history):
    if thread_id:
        return thread_id
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

def ask_gpt(instructions_prompt, thread_id, current_step):
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
    dot_count = 0
    while run.status != "completed":
        run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
        if run.status == "in_progress":
            dot_count += 1
            print(f"Thinking{'. ' * (dot_count // 1)}")
        time.sleep(0.5)

    full_response = client.beta.threads.messages.list(thread_id=thread_id, order="desc", limit=1).data[0].content[0].text.value

    # Try to parse the full response as JSON
    try:
        content = json.loads(full_response)
    except json.JSONDecodeError:
        print("Error: Failed to parse the full response as JSON")
        content = {"response_to_user": full_response, "action": "", "data_state": {}}

    # Save content history
    with open("storage/content_history.txt", "a") as f:
        f.write("current step: " + current_step + "\n\n" + json.dumps(content) + "\n\n###\n\n")
    
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
        response_format={"type": "json_object"},
        messages=[
            user_prompt
        ]
    )

    content = completion.choices[0].message.content

    return content
