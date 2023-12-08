import inquirer from "inquirer";

export default async function confirm(question: string) {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "answer",
      message: question,
    },
  ]);
  return answer.answer;
}
