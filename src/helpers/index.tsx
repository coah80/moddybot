import { EmbedBuilder, REST, Routes } from "discord.js";
import { Commands } from "@/commands/index.ts";
import type { EmbedProps, FieldProps, FooterProps, AuthorProps } from "@/types/index.ts";
import {LogAPI} from "@/utils/logger.ts";

export function h(type: any, props: any, ...children: any[]) {
    if (typeof type === 'function') {
        return type({ ...props, children });
    }
    return { type, props: { ...props, children } };
}

export const Fragment = Symbol('Fragment');

export function Embed(props: EmbedProps): EmbedProps {
    return props;
}

export function Field(props: FieldProps): FieldProps {
    return props;
}

export function Footer(props: FooterProps): FooterProps {
    return props;
}

export function Author(props: AuthorProps): AuthorProps {
    return props;
}

export function buildEmbed(element: any): EmbedBuilder {
    const embed = new EmbedBuilder();

    if (!element) return embed;

    const props = element.props || element;

    if (props.title) embed.setTitle(props.title);
    if (props.description) embed.setDescription(props.description);
    if (props.color) embed.setColor(props.color);
    if (props.url) embed.setURL(props.url);
    if (props.thumbnail) embed.setThumbnail(props.thumbnail);
    if (props.image) embed.setImage(props.image);

    if (props.timestamp) {
        embed.setTimestamp(props.timestamp === true ? new Date() : props.timestamp);
    }

    if (props.children) {
        const children = Array.isArray(props.children)
            ? props.children.flat(Infinity)
            : [props.children];

        for (const child of children) {
            if (!child) continue;

            const childProps = child.props || child;

            if (childProps.text && !childProps.value) {
                embed.setFooter({
                    text: childProps.text,
                    iconURL: childProps.iconURL,
                });
            } else if (childProps.name && childProps.value) {
                embed.addFields({
                    name: childProps.name,
                    value: childProps.value,
                    inline: childProps.inline || false,
                });
            } else if (childProps.name && !childProps.value) {
                embed.setAuthor({
                    name: childProps.name,
                    iconURL: childProps.iconURL,
                    url: childProps.url,
                });
            }
        }
    }

    return embed;
}

import {
    ApplicationIntegrationType,
    InteractionContextType
} from "discord.js";

export async function deployCommands(manager: Commands): Promise<void> {
    await manager.loadCommands();

    const commandsData = manager.getAllCommands().map(cmd => ({
        ...cmd.data.toJSON(),
        integration_types: [
            ApplicationIntegrationType.GuildInstall,  // Works in servers
            ApplicationIntegrationType.UserInstall    // Works in DMs/user context
        ],
        contexts: [
            InteractionContextType.Guild,             // Can be used in servers
            InteractionContextType.BotDM,             // Can be used in bot DMs
            InteractionContextType.PrivateChannel     // Can be used in DMs/GDMs
        ]
    }));

    const rest = new REST().setToken(process.env.TOKEN);

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commandsData },
        );

        LogAPI.log('Refreshed guild commands.');
    } catch (error) {
        LogAPI.err(error);
    }

    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandsData },
        );
        LogAPI.log('Refreshed global commands.');
    } catch (error) {
        LogAPI.err(error);
    }
}

const EXPERIMENT = `https://thunderstore.io/api/experimental/`

export function makeUrl(...args: string[])
{
    return `${EXPERIMENT}${args.join('/')}`
}