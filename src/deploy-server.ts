import { LogAPI } from "@/utils/logger.ts";
import { REST, Routes } from "discord.js";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || "3000");
const DISCORD_TOKEN = process.env.TOKEN || "";
const GUILD_ID = process.env.GUILD_ID || "";
const MODDYBOTPUSH_ID = process.env.MODDYBOTPUSH_ID || "";

const rest = new REST().setToken(DISCORD_TOKEN);

interface GitHubWebhookPayload {
    ref?: string;
    repository?: {
        full_name: string;
        clone_url: string;
    };
    pusher?: {
        name: string;
    };
    commits?: Array<{
        id: string;
        message: string;
    }>;
}

function verifyGitHubSignature(payload: string, signature: string): boolean {
    if (!signature || !signature.startsWith("sha256=")) {
        return false;
    }

    const crypto = new Bun.CryptoHasher("sha256", WEBHOOK_SECRET);
    const digest = "sha256=" + crypto.update(payload).digest("hex");

    return signature === digest;
}

async function sendDiscordMessage(content: string, embed?: any) {
    if (!MODDYBOTPUSH_ID || !DISCORD_TOKEN) {
        LogAPI.log("discord notifications not configured");
        return;
    }

    try {
        await rest.post(Routes.channelMessages(MODDYBOTPUSH_ID), {
            body: embed ? { content, embeds: [embed] } : { content }
        });
    } catch (error) {
        LogAPI.err(`failed to send discord notification: ${error}`);
    }
}

async function executeDeploy(commitMessage?: string, pusher?: string, commitURL?: string) {
    LogAPI.log("starting deployment");

    const repoDir = "/home/cole/moddybot";

    try {
        const embed = {
            title: "\u{1F504} Deploying...",
            description: `\`\`\`\n${commitMessage || "deploying latest changes"}\n\`\`\``,
            color: 0xf59e0b,
            fields: [
                {
                    name: "\u{1F464} Pushed by",
                    value: pusher || "unknown",
                    inline: true
                },
                {
                    name: "\u{1F4E6} Status",
                    value: "Pulling changes...",
                    inline: true
                },
                ...(commitURL ? [{
                    name: "\u{1F517} Commit",
                    value: `[View on GitHub](${commitURL})`,
                    inline: false
                }] : [])
            ],
            footer: { text: "moddybot deploy" },
            timestamp: new Date().toISOString()
        };

        await sendDiscordMessage("", embed);

        LogAPI.log("resetting to match remote");
        const gitFetch = Bun.spawn(["git", "fetch", "origin", "main"], {
            cwd: repoDir,
            stdout: "pipe",
            stderr: "pipe",
        });
        await gitFetch.exited;

        const gitReset = Bun.spawn(["git", "reset", "--hard", "origin/main"], {
            cwd: repoDir,
            stdout: "pipe",
            stderr: "pipe",
        });
        await gitReset.exited;
        const resetOutput = await new Response(gitReset.stdout).text();
        LogAPI.log(resetOutput);

        LogAPI.log("installing dependencies");
        const bunInstall = Bun.spawn(["bun", "install"], {
            cwd: repoDir,
            stdout: "pipe",
            stderr: "pipe",
        });

        await bunInstall.exited;

        await sendDiscordMessage("", {
            description: "Stopping bot for update...",
            color: 0x6366f1,
            footer: { text: "moddybot deploy" },
            timestamp: new Date().toISOString()
        });

        LogAPI.log("restarting bot");
        const restart = Bun.spawn(["sudo", "systemctl", "restart", "moddybot"], {
            cwd: repoDir,
            stdout: "pipe",
            stderr: "pipe",
        });

        const exitCode = await restart.exited;
        const stdout = await new Response(restart.stdout).text();
        const stderr = await new Response(restart.stderr).text();

        if (exitCode === 0) {
            LogAPI.log("deployment completed successfully");

            const successEmbed = {
                title: "\u2705 Back Online",
                description: `\`\`\`\n${commitMessage || "latest updates deployed"}\n\`\`\``,
                color: 0x22c55e,
                fields: [
                    ...(commitURL ? [{
                        name: "\u{1F517} Commit",
                        value: `[View on GitHub](${commitURL})`,
                        inline: false
                    }] : [])
                ],
                footer: { text: "moddybot deploy" },
                timestamp: new Date().toISOString()
            };

            await sendDiscordMessage("", successEmbed);
            return true;
        } else {
            LogAPI.err("deployment failed");
            LogAPI.err(stderr);

            await sendDiscordMessage("", {
                title: "\u274C Deploy Failed",
                description: "The bot restart exited with a non-zero code. Check server logs.",
                color: 0xef4444,
                fields: stderr ? [{
                    name: "stderr",
                    value: `\`\`\`\n${stderr.slice(0, 1000)}\n\`\`\``,
                    inline: false
                }] : [],
                footer: { text: "moddybot deploy" },
                timestamp: new Date().toISOString()
            });
            return false;
        }
    } catch (error) {
        LogAPI.err("deployment error");
        LogAPI.err(String(error));

        await sendDiscordMessage("", {
            title: "\u{1F4A5} Deploy Error",
            description: `\`\`\`\n${String(error).slice(0, 1000)}\n\`\`\``,
            color: 0xdc2626,
            footer: { text: "moddybot deploy" },
            timestamp: new Date().toISOString()
        });
        return false;
    }
}

const server = Bun.serve({
    port: WEBHOOK_PORT,
    async fetch(req: Request) {
        const url = new URL(req.url);

        if (url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "ok" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        if (url.pathname === "/webhook" && req.method === "POST") {
            const signature = req.headers.get("x-hub-signature-256") || "";
            const event = req.headers.get("x-github-event") || "";

            const payload = await req.text();

            if (!verifyGitHubSignature(payload, signature)) {
                LogAPI.err("invalid webhook signature");
                return new Response(JSON.stringify({ error: "invalid signature" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (event !== "push") {
                return new Response(JSON.stringify({ message: "event ignored" }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            const data: GitHubWebhookPayload = JSON.parse(payload);

            LogAPI.log(`received push event from ${data.pusher?.name}`);
            LogAPI.log(`repository: ${data.repository?.full_name}`);
            LogAPI.log(`ref: ${data.ref}`);

            const commitMessage = data.commits?.[0]?.message || "no commit message";
            const repoName = data.repository?.full_name || "unknown repo";            
            const commitURL = `https://github.com/${repoName}/commit/${data.commits?.[0]?.id}` || "";
            const pusher = data.pusher?.name || "unknown";

            const success = await executeDeploy(commitMessage, pusher, commitURL);

            return new Response(
                JSON.stringify({
                    message: success ? "deployment triggered" : "deployment failed",
                }),
                {
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        return new Response("not found", { status: 404 });
    },
});

LogAPI.log(`webhook server running on port ${WEBHOOK_PORT}`);
LogAPI.log("endpoints:");
LogAPI.log("  - POST /webhook (github webhooks)");
LogAPI.log("  - GET  /health (health check)");
