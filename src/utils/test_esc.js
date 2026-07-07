const content = `embed.setImage(\`attachment://\${filename}\`);`;
console.log("Output with \\${filename} :", content);

const content2 = `embed.setImage(\`attachment://\\\${filename}\`);`;
console.log("Output with \\\\\\${filename} :", content2);
