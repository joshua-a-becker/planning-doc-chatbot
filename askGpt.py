from pydantic import BaseModel
# import time
# import os
from openai import OpenAI
import json
from typing_extensions import override
from openai import AssistantEventHandler

my_key = open('key_to_gpt.txt','r').readline()
client = OpenAI(api_key=my_key)


 
data_response_format = {
    "type": "json_schema",
    "json_schema": {
        "name": "coaching_response",  # Changed to lowercase to follow convention
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "structured_notes": {
                    "type": "string",
                    "description": "Formal notes following facilitator process structure go here"
                },
                "additional_notes": {
                    "type": "string",
                    "description": "any additional notes including brief case narrative go here"
                },
                "unaddressed_questions": {
                    "type": "string",
                    "description": "any lingering questions go here (remove answered questions)"
                },
            },
            "required": ["structured_notes", "additional_notes", "unaddressed_questions"],
            "additionalProperties": False
        }
    }
}



response_format = {
    "type": "json_schema",
    "json_schema": {
        "name": "coaching_response",  # Changed to lowercase to follow convention
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "special_notes": {
                    "type": "string",
                    "description": "Any special notes informing your process."
                },
                "action_explanation": {
                    "type": "string",
                    "description": "The reasoning behind the action you are about to recommend."
                },
                "action": {
                    "type": "string",
                    "description": "The action to take: structured_reflection, open_ended_question, process_map, change_step"
                },
                "action_data": {
                    "type": "string",
                    "description": "Any valid JSON object containing relevant data for the action such as feelings/values/topics OR the change_step new step update (critical!)"
                },
                "response_to_user": {
                    "type": "string",
                    "description": "The text of the response that will be displayed to the client."
                }
            },
            "required": ["special_notes", "action_explanation", "action", "action_data", "response_to_user"],
            "additionalProperties": False
        }
    }
}



def ask_gpt_strategy(instructions_prompt, thread_id, session_id, user_id, current_step):
    # Create or retrieve the assistant
    assistant = client.beta.assistants.create(
        name="Negotiation Coach",
        instructions=instructions_prompt,
        model="gpt-4o",
    )
    
    # Run the assistant
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant.id
    )

    # Stream the thinking indicator
    update_chat_display("Thinking", user_id, is_initial=True)
    dot_count = 0
    while run.status != "completed":
        run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
        if run.status == "in_progress":
            dot_count += 1
            update_chat_display(f"Thinking{'. ' * (dot_count // 1)}", user_id, is_initial=False)

    
    ## PRINT ALL MESSAGES
    # all_messages = client.beta.threads.messages.list(thread_id=thread_id, order="asc")
    # print("####MESSAGES####")
    # for message in all_messages:
    #     print(f"{message.role}: {message.content[0].text.value}")
    # print("###############")

    full_response = client.beta.threads.messages.list(thread_id=thread_id, order="desc", limit=1).data[0].content[0].text.value
    
    # print("FULL RESPONSE") 
    # print(full_response)

    # Try to parse the full response as JSON
    try:
        content = json.loads(full_response)
    except json.JSONDecodeError:
        print("Error: Failed to parse the full response as JSON.  Trying again.")
        print("INCORRECTLY FORMATTED RESPONSE: " + full_response)

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": 'You are a JSON validator.  We have received something that is not correctly formatted.  If possible, please return it in JSON format.'},
                {"role": "user", "content": full_response}
            ],
            temperature=0,
            max_tokens=1000
        )
        
        try:
            content = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            print("Error: Second attempt failed to parse the full response as JSON.  Returning raw content")
            content = {"response_to_user": full_response, "action": "", "data_state": {}}
        
        

        
    with open("storage/content_history.txt", "a") as f:
        f.write("current step: " + current_step + "\n\n" +json.dumps(content) + "\n\n###\n\n")
    
    with open("storage/last_content.txt", "w") as f:
        f.write(json.dumps(content))

    return content




def ask_gpt_response(instructions_prompt, thread_id, session_id, user_id, current_step, chat_history):
    # Create or retrieve the assistant
    assistant = client.beta.assistants.create(
        name="Negotiation Coach",
        instructions=instructions_prompt,
        model="gpt-4o",
    )
    
    # Run the assistant
    # run = client.beta.threads.runs.create(
    #     thread_id=thread_id,
    #     assistant_id=assistant.id
    # )

    # # Stream the thinking indicator
    # update_chat_display("Thinking", user_id, is_initial=True)
    # dot_count = 0
    # while run.status != "completed":
    #     run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
    #     if run.status == "in_progress":
    #         dot_count += 1
    #         update_chat_display(f"Thinking{'. ' * (dot_count // 1)}", user_id, is_initial=False)


        # update_chat_display("Thinking", user_id, is_initial=True)
    # dot_count = 0
    # while run.status != "completed":
    #     run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
    #     if run.status == "in_progress":
    #         dot_count += 1
    #         update_chat_display(f"Thinking{'. ' * (dot_count // 1)}", user_id, is_initial=False)

    class ResponseAccumulator:
        def __init__(self):
            self.text = ""

    final_response = ResponseAccumulator()

    class EventHandler(AssistantEventHandler):    
        @override
        def on_text_created(self, text) -> None:
            with open('ux/userdata/chatTranscript_'+user_id+'.json', 'r+') as file:
                file.seek(0)
                json.dump(chat_history, file)
                file.truncate()
            print(f"\nassistant > ", end="", flush=True)
            update_chat_display("", user_id, is_initial=True)
            
        @override
        def on_text_delta(self, delta, snapshot):            
            print(delta.value, end="", flush=True)
            final_response.text += delta.value
            update_chat_display(final_response.text, user_id, is_initial=False)

    with client.beta.threads.runs.stream(
        thread_id=thread_id,
        assistant_id=assistant.id,
        instructions=instructions_prompt,
        event_handler=EventHandler(),
    ) as stream:
        stream.until_done()    

    return final_response.text



def ask_gpt_data(prompt: str):
    user_prompt = {
        "role": "user",
        "content": prompt
    }
    
    completion = client.chat.completions.create(
        model="gpt-4o",
        # model="gpt-4o-mini",
        response_format=data_response_format,
        messages=[
            user_prompt
        ]
    )

    # content = json.loads(completion.choices[0].message.content)
    content = completion.choices[0].message.content

    return content



def update_chat_display(message, user_id, is_initial=True):
    with open('ux/userdata/chatTranscript_'+user_id+'.json', 'r+') as file:
        chat_history = json.load(file)
        
    if is_initial:
        # Add a new message
        chat_history.append({"role": "Negotiation Coach", "content": message})
    else:
        # Replace the last message with the final response
        chat_history[-1] = {"role": "Negotiation Coach", "content": message}
    
    with open('ux/userdata/chatTranscript_'+user_id+'.json', 'r+') as file:
        file.seek(0)
        json.dump(chat_history, file)
        file.truncate()


