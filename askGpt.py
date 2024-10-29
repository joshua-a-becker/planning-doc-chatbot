from pydantic import BaseModel
# import time
# import os
from openai import OpenAI
import json
from typing_extensions import override
from typing import Union, List, Literal
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

##action: list[Union[ChangeStep,StructuredReflection]]

ProcessStep = Literal[
    "step_zero_explain_process",
    "step_one_intro_discovery",
    "step_two_topics_validating",
    "step_three_topics_values",
    "step_four_batna"
]  

class Reflection(BaseModel):
    type: Literal["reflection"]
    feelings: List[str]
    values: List[str]
    topics: List[str]
    closing_phrase: str
    follow_up_question: str

class OpenQuestion(BaseModel):
    type: Literal["open_ended_question"]
    feelings: List[str]
    values: List[str]
    topics: List[str]
    goal_of_question: str
    the_question: str

class ProcessMap(BaseModel):
    type: Literal["process_map"]
    user_is_trying_to: str
    current_step_is: str
    explanation_and_or_redirecting_comment: str

class StrategyFormat(BaseModel):
    general_overview: str
    action: Reflection | OpenQuestion | ProcessMap
    current_step: ProcessStep
    next_step: ProcessStep

    
    #general_overview:  a human-readable analysis of the situation and what action you recommend.
    #action: one of SIX ACTIONS:[structured_reflection, open_ended_question, process_map, advisory_comment, general_comment]
    #current_step:  the current step
    #next_step:  the next step, which will usually be the current step unless you are process mapping.



def ask_gpt_strategy(messages, session_id, user_id):
    
    # Run the completion API on the strategy prompt
    update_chat_display("<THINKING/><THINKINGDOTS/>", user_id, is_initial=True)
    run = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=messages,
        response_format = StrategyFormat
    )

    content = run.choices[0].message.parsed.model_dump()
    
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


def test_structured_output():
    print("testing structured output")

    class CalendarEvent(BaseModel):
        name: str
        date: str
        participants: list[str]

    completion = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {"role": "system", "content": "Extract the event information."},
            {"role": "user", "content": "Alice and Bob are going to a science fair on Friday."},
        ],
        response_format=CalendarEvent,
    )

    event = completion.choices[0].message.parsed

    print("finished structured output")