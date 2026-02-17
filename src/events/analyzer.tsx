import type {Message} from "discord.js";

const ERROR_REGEX = /\[Error\s*:\s+(?<mod>.+?)\]\s*(?<error>.+?)\r?\nStack trace:\r?\n.+?\(at (?<file>[^:]+):\d+\)/g

export default {
    name: "messageCreate",
    async execute(message: Message) {
        const files = await Promise.all(message.attachments.map(async x => {
            if (x.contentType?.includes("text")) {
                const res = await fetch(x.url);
                const text = await res.text();
                return { text, name: x.name, url: x.url }
            }
        }))

        const errors = files
            .filter(x => x)
            .flatMap(x => {
                return Array.from(x!.text.matchAll(ERROR_REGEX)).map(match => {
                    const { _, error, file } = match.groups!;
                    return `**Mod:** ${file.split("/")[0]} | **Error:** ${error} | **File:** ${file}`;
                });
            });

        if (errors.length > 0) {
            await message.reply({ content: errors.join('\n') })
        }
    }
}