from openai import OpenAI
import argparse
my_key = open('key_to_gpt.txt','r').readline()
client = OpenAI(api_key=my_key)

def ask_gpt(prompt: str, chat_history: list):
    import json
    user_prompt =  {
                "role": "user",
                "content": prompt
            }
    
    completion = client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            *chat_history,
            user_prompt
        ]
    )
    content = completion.choices[0].message.content
    content = json.loads(content)
    response = content['response_to_user']
    chat_history.append(user_prompt)
    chat_history.append({"role": "assistant", "content": response})
    print("JB: " + response)
    return content

def main():
    print("GPT Start")
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "prompt", nargs = "+", type = str
    )

    args = parser.parse_args()
    prompt = " ".join(args.prompt)
    print(f"Q: {prompt}")

    template = {
        "action" : "question, reflection, process mapping, or answer",
        "action_data" : "{ action_data_object_goes_here }",
        "response_to_user" : "response to user goes here"
        }

    chat_history = [ {
            "role": "system",
            "content": f"Please respond to all questions in JSON format using the following template: {template}"
        }]

    ask_gpt(prompt, chat_history)
    user_input = input(">_: ")
    while user_input != "":
        # Ideally we would store this for later use if needed
        ask_gpt(user_input, chat_history)
        user_input = input(">_: ")

    print("GPT End")

if __name__ == "__main__":
    main()