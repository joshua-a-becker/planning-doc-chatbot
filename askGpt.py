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



## STRATEGY RESPONSE STRUCTURE

ProcessStep = Literal[
    "step_zero_explain_process",
    "step_one_intro_discovery",
    "step_two_topics_validating",
    "step_three_topics_values",
    "step_four_batna",
    "step_five_perspective_taking",
    "step_five_part_two_perspective_batna"
    "step_six_strategy",
    "step_seven_discussion"
]  

class QuestionAfterReflection(BaseModel):
    type: Literal["question_with_reflection"]
    feelings: List[str]
    values: List[str]
    topics: List[str]
    closing_phrase: str
    follow_up_question: str

class Reflection(BaseModel):
    type: Literal["reflection_only"]
    feelings: List[str]
    values: List[str]
    topics: List[str]
    closing_phrase: str

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

class Overview(BaseModel):
     type: Literal["general_narrative_overview"]
     narrative_summary: str
     action: str
     explanation: str
     additional_comments: str

class StrategyFormat(BaseModel):
    general_overview: Overview
    action: Reflection | OpenQuestion | QuestionAfterReflection | ProcessMap
    current_step: ProcessStep
    next_step: ProcessStep



## NOTES RESPONSE STRUCTURE
class TreeTopic(BaseModel):
    type: Literal["tree_topic"]
    name: str
    position: str
    values: List[str]
    feelings: List[str]


class NotesFormat(BaseModel):
     general_narrative: str
     analysis: str
     feelings: List[str]
     values: List[str]
     topics: List[TreeTopic]


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




def ask_gpt_response(messages, thread_id,user_id, chat_history):


    with open('ux/userdata/chatTranscript_'+user_id+'.json', 'r+') as file:
                    file.seek(0)
                    json.dump(chat_history, file)
                    file.truncate()
    update_chat_display("<THINKING/>", user_id, is_initial=True)

    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        stream=True,
    )

    class ResponseAccumulator:
        def __init__(self):
            self.text = ""

    final_response = ResponseAccumulator()
    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            final_response.text += chunk.choices[0].delta.content
            update_chat_display("<THINKING/>"+final_response.text, user_id, is_initial=False)

    final_response_with_signal = "<COMPLETED/>" + final_response.text
    update_chat_display(final_response_with_signal, user_id, is_initial=False)

    return final_response.text



def ask_gpt_data(messages):

    run = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=messages,
        response_format = NotesFormat
    )
    content = run.choices[0].message.parsed.model_dump()

    # content = json.loads(completion.choices[0].message.content)
    # content = completion.choices[0].message.content

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