/** @jsx h */
/** @jsxFrag Fragment */

import { AttachmentBuilder, type Message, type TextChannel } from "discord.js";
import { buildEmbed, Field, Fragment, h, Embed, Author } from "@/helpers/index.tsx";
import { getGuildConfig } from "@/utils/config.ts";
import type { Event } from "@/types/index.ts";
import { LogAPI } from "@/utils/logger.ts";
import { createWorker } from "tesseract.js";
import { Buffer } from "node:buffer";
import { shouldBypass } from "@/utils/checks.ts";

const urlRegex = /https?:\/\/\S+/gi;

const CRYPTO_KEYWORDS = [
    "crypto", "elonmusk", "bitcoin", "raydium",
    "ethereum", "nft", "mrbeast", "kaicenat",
    "withdrawal", "bonus",
];

export function detectFileType(bytes: Buffer): string {
    const sig = bytes.slice(0, 32);
    const hex = Array.from(sig)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    if (hex.startsWith("89504e47")) return "image/png";
    if (hex.startsWith("ffd8ff")) return "image/jpeg";
    if (hex.startsWith("47494638")) return "image/gif";
    if (hex.startsWith("49492a00") || hex.startsWith("4d4d002a")) return "image/tiff";
    if (hex.startsWith("00000200") || hex.startsWith("00001000")) return "image/x-tga";
    if (hex.startsWith("38425053")) return "image/psd";
    if (hex.startsWith("7a585a46")) return "image/ktx";
    if (hex.startsWith("89504e470d0a1a0a0000000d49484452")) return "image/apng";
    if (hex.startsWith("424d")) return "image/bmp";
    if (hex.startsWith("52494646") && hex.includes("57454250")) return "image/webp";
    if (hex.startsWith("000000186674797069736f6d")) return "video/mp4";
    if (hex.startsWith("0000001c6674797069736f6d")) return "video/mp4";
    if (hex.startsWith("00000020667479706d703432")) return "video/mp4";
    if (hex.startsWith("1a45dfa3")) return "video/webm";
    if (hex.startsWith("52494646") && hex.includes("41564920")) return "video/avi";
    if (hex.startsWith("000001ba") || hex.startsWith("000001b3")) return "video/mpeg";
    if (hex.startsWith("667479706d703432")) return "video/mp4";
    if (hex.startsWith("494433")) return "audio/mpeg";
    if (hex.startsWith("fff")) return "audio/mpeg";
    if (hex.startsWith("4f676753")) return "audio/ogg";
    if (hex.startsWith("52494646") && hex.includes("57415645")) return "audio/wav";
    if (hex.startsWith("664c6143")) return "audio/flac";
    if (hex.startsWith("504b0304")) return "application/zip";
    if (hex.startsWith("1f8b08")) return "application/gzip";
    if (hex.startsWith("425a68")) return "application/x-bzip2";
    if (hex.startsWith("377abcaf271c")) return "application/x-7z-compressed";
    if (hex.startsWith("526172211a07")) return "application/x-rar-compressed";
    if (hex.startsWith("25504446")) return "application/pdf";
    if (hex.startsWith("7b226")) return "application/json";
    if (hex.startsWith("3c3f786d6c")) return "application/xml";
    if (hex.startsWith("efbbbf")) return "text/plain";

    return "application/octet-stream";
}

export default {
    name: "messageCreate",
    async execute(message: Message) {
        if (!message.guild || message.author.bot) return;
        if (message.author.id === process.env.CLIENT_ID) return;
        if (await shouldBypass(message)) return;

        const config = getGuildConfig(message.guildId!);
        const badLinks: string[] = config.links ?? [];
        const foundUrls = message.content.match(urlRegex) ?? [];

        const alertChannel = message.guild.channels.cache.get(
            config.log_channel ?? process.env.ALERT_CHANNEL_ID
        ) as TextChannel | undefined;

        // --- Bad link check ---
        const hasBadLink = foundUrls.some(url =>
            badLinks.some(bad => url.includes(bad))
        );

        if (hasBadLink && alertChannel) {
            try { await message.delete(); } catch {
                LogAPI.err("Could not delete message with bad link.");
            }
            await alertChannel.send({
                embeds: [
                    buildEmbed(
                        <Embed title="Disallowed Link Detected" description={foundUrls.join("\n")}>
                            <Author
                                name={message.author.username}
                                iconURL={message.author.avatarURL() ?? undefined}
                            />
                            <Field name="User" value={`<@${message.author.id}>`} inline={true} />
                            <Field name="Channel" value={`<#${message.channel.id}>`} inline={true} />
                        </Embed>
                    ),
                ],
            });
        }

        // --- Crypto scam image check ---
        const allMedia = [
            ...foundUrls.map(url => ({ url, source: "url" as const })),
            ...message.attachments.map(a => ({ url: a.url, source: "attachment" as const })),
        ];

        if (allMedia.length === 0) return;

        const blobs = await Promise.allSettled(
            allMedia.map(async ({ url }) => {
                const res = await fetch(url);
                const blob = await res.blob();
                return { url, type: blob.type };
            })
        );

        const imageBlobs = blobs
            .filter((r): r is PromiseFulfilledResult<{ url: string; type: string }> =>
                r.status === "fulfilled" && r.value.type.startsWith("image")
            )
            .map(r => r.value);

        if (imageBlobs.length === 0) return;

        const worker = await createWorker("eng");

        const cryptoResults = await Promise.allSettled(
            imageBlobs.map(async ({ url }) => {
                const { data } = await worker.recognize(url);
                const lower = data.text.toLowerCase();
                const found = CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
                return { url, found };
            })
        );

        await worker.terminate();

        const foundScams = cryptoResults
            .filter((r): r is PromiseFulfilledResult<{ url: string; found: boolean }> =>
                r.status === "fulfilled" && r.value.found
            )
            .map(r => r.value);

        if (foundScams.length === 0 || !alertChannel) return;

        try { await message.delete(); } catch {
            LogAPI.err("Could not delete crypto scam message.");
        }

        const evidenceFiles = await Promise.allSettled(
            foundScams.map(async ({ url }) => {
                const res = await fetch(url);
                const buf = await res.arrayBuffer();
                return new AttachmentBuilder(Buffer.from(buf), { name: "scam-evidence.png" });
            })
        );

        const validFiles = evidenceFiles
            .filter((r): r is PromiseFulfilledResult<AttachmentBuilder> => r.status === "fulfilled")
            .map(r => r.value);

        const cryptoEmbed = buildEmbed(
            <Embed
                title="Potential Crypto Scam Detected"
                description="A message containing suspicious crypto-related content was automatically removed."
                color={0xFF0000}
            >
                <Author
                    name={message.author.username}
                    iconURL={message.author.avatarURL() ?? undefined}
                />
                <Field name="User" value={`<@${message.author.id}>`} inline={true} />
                <Field name="Channel" value={`<#${message.channel.id}>`} inline={true} />
                <Field name="Suspicious URLs" value={foundScams.map(x => x.url).join("\n")} />
            </Embed>
        );

        await alertChannel.send({ embeds: [cryptoEmbed], files: validFiles });

        if ((config.should_dm ?? "true") === "true") {
            try {
                await message.author.send({
                    embeds: [
                        buildEmbed(
                            <Embed
                                title={`Security Alert from ${message.guild.name}`}
                                description="Your account sent a message containing suspicious crypto-related content that was automatically removed."
                                color={0xFFA500}
                            >
                                <Field
                                    name="What happened?"
                                    value="An image or message from your account included words commonly associated with scams."
                                />
                                <Field
                                    name="If this was you"
                                    value="You can safely ignore this message. Be aware that crypto-related content may be flagged in future."
                                />
                                <Field
                                    name="If this was NOT you"
                                    value="Your account may be compromised. Please:\n• Reset your password immediately\n• Enable Two-Factor Authentication (2FA)\n• Review authorized apps at [discord.com/settings/authorized-apps](https://discord.com/settings/authorized-apps)\n• Check the Devices tab and remove any unknown sessions."
                                />
                                <Field
                                    name="Evidence"
                                    value="The flagged content is attached for your reference."
                                />
                            </Embed>
                        ),
                    ],
                    files: validFiles,
                });
            } catch {
                LogAPI.err("Could not DM user — DMs may be disabled.");
            }
        }
    },
} satisfies Event<"messageCreate">;