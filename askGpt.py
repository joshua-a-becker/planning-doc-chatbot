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



strategy_format = {
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
                }
            },
            "required": ["special_notes", "action_explanation", "action", "action_data"],
            "additionalProperties": False
        }
    }
}



def ask_gpt_strategy(strategy_prompt, session_id, user_id):
    
    # Run the completion API on the strategy prompt
    run = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": strategy_prompt}],
        stream=True,
        response_format = strategy_format
    )

    # Stream the thinking indicator
    full_response = ""
    update_chat_display("<THINKING/>Thinking", user_id, is_initial=True)
    dot_count = 0
    for chunk in run:
        dot_count += 1
        if dot_count>100: 
            dot_count=1

        update_chat_display(f"<THINKING/>Thinking{'. ' * ((dot_count*10) // 50)}", user_id, is_initial=False)
        if chunk.choices[0].delta.content is not None:
            full_response += chunk.choices[0].delta.content


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
        

    return content




def ask_gpt_response(instructions_prompt, thread_id,user_id, chat_history):
    # Create or retrieve the assistant
    assistant = client.beta.assistants.create(
        name="Negotiation Coach",
        instructions=instructions_prompt,
        model="gpt-4o",
    )

    # print("COACH RESPONSE THREAD MESSAGES")
    # messages = client.beta.threads.messages.list(thread_id=thread_id)
    # for msg in messages:
    #     print(f"Role: {msg.role}")
    #     print(f"Content: {msg.content[0].text.value}")
    # print("END COACH RESPONSE THREAD MESSAGES")

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
            update_chat_display("<THINKING/>", user_id, is_initial=True)
            
        @override
        def on_text_delta(self, delta, snapshot):            
            final_response.text += delta.value
            update_chat_display("<THINKING/>"+final_response.text, user_id, is_initial=False)

    with client.beta.threads.runs.stream(
        thread_id=thread_id,
        assistant_id=assistant.id,
        instructions=instructions_prompt,
        event_handler=EventHandler(),
    ) as stream:
        stream.until_done()    

    final_response_with_signal = "<COMPLETED/>" + final_response.text
    update_chat_display(final_response_with_signal, user_id, is_initial=False)

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


