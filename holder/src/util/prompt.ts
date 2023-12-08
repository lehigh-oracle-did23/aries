import inquirer from "inquirer";

export default async function prompt(question: string) {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "answer",
      message: question,
    },
  ]);
  return answer.answer;
}