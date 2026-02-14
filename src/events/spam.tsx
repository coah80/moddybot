/** @jsx h */
/** @jsxFrag Fragment */

import {AttachmentBuilder, type Message, type Snowflake, type TextChannel} from "discord.js";
import {buildEmbed, Field, Fragment, h, Embed, Author} from "@/helpers/index.tsx";
import {getConfig} from "@/utils/config.ts";
import type {Event} from "@/types/index.ts";
import {LogAPI} from "@/utils/logger.ts";
import {createWorker} from "tesseract.js";
import {Buffer} from "node:buffer";
import guide from "@/commands/guide.ts";

const urlRegex = /https?:\/\/\S+/gi;

export function detectFileType(bytes: Buffer): string {
    const sig = bytes.slice(0, 32);
    const hex = Array.from(sig)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    if (hex.startsWith("89504e47")) return "image/png";
    if (hex.startsWith("ffd8ff")) return "image/jpeg";
    if (hex.startsWith("47494638")) return "image/gif";
    if (hex.startsWith("49492a00") || hex.startsWith("4d4d002a"))
        return "image/tiff";
    if (hex.startsWith("00000200") || hex.startsWith("00001000"))
        return "image/x-tga";
    // TGA header (2 and 10 are most popular. others are weird video editor nerd formats)

    if (hex.startsWith("38425053")) return "image/psd";
    if (hex.startsWith("7a585a46")) return "image/ktx";
    if (hex.startsWith("89504e470d0a1a0a0000000d49484452")) return "image/apng";

    if (hex.startsWith("424d")) return "image/bmp";
    if (hex.startsWith("52494646") && hex.includes("57454250"))
        return "image/webp"; // RIFF....WEBP

    if (hex.startsWith("000000186674797069736f6d")) return "video/mp4"; // MP4 - BMFF
    if (hex.startsWith("0000001c6674797069736f6d")) return "video/mp4"; // MP4 - basic?
    if (hex.startsWith("00000020667479706d703432")) return "video/mp4"; // MP4 - MPEG-4
    if (hex.startsWith("1a45dfa3")) return "video/webm"; // Matroska (WebM)
    if (hex.startsWith("52494646") && hex.includes("41564920"))
        return "video/avi"; // RIFF....AVI
    if (hex.startsWith("000001ba") || hex.startsWith("000001b3"))
        return "video/mpeg";
    if (hex.startsWith("667479706d703432")) return "video/mp4";

    if (hex.startsWith("494433")) return "audio/mpeg"; // MP3 ID3... ?
    if (hex.startsWith("fff")) return "audio/mpeg"; // why are raw mp3s so vague
    if (hex.startsWith("4f676753")) return "audio/ogg";
    if (hex.startsWith("52494646") && hex.includes("57415645"))
        return "audio/wav";
    if (hex.startsWith("664c6143")) return "audio/flac";

    if (hex.startsWith("504b0304")) return "application/zip";
    if (hex.startsWith("1f8b08")) return "application/gzip";
    if (hex.startsWith("425a68")) return "application/x-bzip2";
    if (hex.startsWith("377abcaf271c")) return "application/x-7z-compressed";
    if (hex.startsWith("526172211a07")) return "application/x-rar-compressed";
    if (hex.startsWith("25504446")) return "application/pdf";

    if (hex.startsWith("7b226")) return "application/json"; // just detects parsing {" <--
    if (hex.startsWith("3c3f786d6c")) return "application/xml"; // <?xml
    if (hex.startsWith("efbbbf"))
        return "text/plain"; // very big unreliable fallback

    return "application/octet-stream"; // how should I handle files we dont support... just *store it* ?
}

export default {
    name: "messageCreate",
    async execute(message: Message) {
        const badLinks: string[] = getConfig().links;
        if (!message.guild || !badLinks || message.author.id == process.env.CLIENT_ID) return;

        const foundUrls = message.content.match(urlRegex) || [];

        const hasBadLink = foundUrls.some(url =>
            badLinks.some(badLink => url.includes(badLink))
        );

        const linkEmbed = buildEmbed(
            <Embed title={"Disallowed link"} description={foundUrls.join(", ")}>
                <Field name={"User"} value={`<@${message.author.id}>`}/>
            </Embed>
        );

        const blobs = await Promise.all([
            ...foundUrls.map(async url => {
                const response = await fetch(url)
                const blob = await response.blob();
                return {
                    url: url,
                    type: blob.type,
                }
            }),
            ...message.attachments.map(async attachment => {
                const response = await fetch(attachment.url)
                const blob = await response.blob();
                return {
                    url: attachment.url,
                    type: blob.type,
                }
            })
        ])

        const worker = await createWorker('eng');

        const hasCrypto = await Promise.all(blobs.map(async (x) => {
            if (!x.type.startsWith("image")) return;

            const text = await worker.recognize(x.url)
            const lowerText = text.data.text.toLowerCase();

            return {
                found: ['crypto', 'elonmusk', 'bitcoin', 'raydium', 'ethereum','nft',"MrBeast", "mrbeast", "KaiCenat", "kaicenat", "withdrawal", "bonus"].some(keyword =>
                    lowerText.includes(keyword)
                ),
                url: x.url
            }
        }))

        await worker.terminate()
        const foundCryptoScams = hasCrypto.filter(x => x && x.found);

        try {
            const alertChannel = message.guild.channels.cache.get(process.env.ALERT_CHANNEL_ID) as TextChannel;
            if (alertChannel && hasBadLink) {
                await message.delete();
                await alertChannel.send({
                    embeds: [linkEmbed],
                });
            }
            if (foundCryptoScams.length > 0) {
                const cryptoEmbed = buildEmbed(
                    <Embed
                        title={"Potential Crypto Scam Detected"}
                        description={"A message containing suspicious crypto-related content was automatically deleted."}
                        color={0xFF0000}
                    >
                        <Author name={message.author.username} iconURL={message.author.avatarURL()}/>
                        <Field name={"User"} value={`<@${message.author.id}>`} inline={true}/>
                        <Field name={"Channel"} value={`<#${message.channel.id}>`} inline={true}/>
                        <Field name={"Suspicious URLs"} value={foundCryptoScams.map(x => x.url).join("\n")}/>
                    </Embed>
                );

                const orgFiles = await Promise.all(
                    foundCryptoScams.map(async x => {
                        const response = await fetch(x.url);
                        const content = await response.arrayBuffer();
                        return new AttachmentBuilder(
                            Buffer.from(content),
                            {name: 'scam-evidence.png'}
                        );
                    })
                );
                await alertChannel.send({
                    embeds: [cryptoEmbed],
                    files: orgFiles
                })
                await message.delete();
                await message.author.send({
                    embeds: [buildEmbed(
                        <Embed
                            title={"Security Alert from REPO Modding Discord"}
                            description={"Your account sent a message containing suspicious crypto-related content that was automatically removed."}
                            color={0xFFA500}
                        >
                            <Field
                                name={"What happened?"}
                                value={"An image or message from your account included words that are commonly associated with scams."}
                            />
                            <Field
                                name={"If this was you"}
                                value={"You can safely ignore this message. Please be aware that crypto-related content may be flagged in the future."}
                            />
                            <Field
                                name={"If this was NOT you"}
                                value={"Your account may be compromised. Please:\n• Reset your password immediately\n• Enable Two-Factor Authentication (2FA)\n• Review and remove any suspicious authorized apps at [discord.com/settings/authorized-apps](https://discord.com/settings/authorized-apps)\n• Check for any unfamiliar activity"}
                            />
                            <Field
                                name={"Evidence"}
                                value={"The flagged content is attached above for your reference. You are kicked in the meantime. Please recover your account."}
                            />
                        </Embed>
                    )],
                    files: orgFiles
                })
                //await message.guild.members.cache.get(message.author.id)?.timeout(6.048e+8)
            }
        } catch (e) {
            console.log(e);
        }
    }
} satisfies Event<"messageCreate">