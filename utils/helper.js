import readline from "readline";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
export const confirm = question => new Promise(res => rl.question(`${question}? (y/n)\n`, function(ans) {
    if (ans == "y" || ans == "yes") res(true);
    else res(false);
    // pause the interface so the program can exit
    rl.pause();
}));