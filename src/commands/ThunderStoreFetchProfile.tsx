import {
    SlashCommandBuilder,
    Client,
    ChatInputCommandInteraction,
    FileBuilder,
    Attachment,
    AttachmentBuilder, ActionRowBuilder, type ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    type StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, type ModalSubmitInteraction
} from 'discord.js';
// @ts-ignore
import AdmZip from 'adm-zip';
// @ts-ignore
import * as yaml from 'js-yaml';
import {Buffer} from 'node:buffer';
import {buildEmbed, Embed, Field, Footer, h, Fragment} from "@/helpers";
import { Parser } from '@thednp/domparser';
import * as cheerio from'cheerio';

const PROFILE_DATA_PREFIX = "#r2modman";

interface ModVersion {
    major: number;
    minor: number;
    patch: number;
}

interface Mod {
    name: string;
    version: ModVersion;
    enabled: boolean;
}

interface ProfileData {
    profileName: string;
    mods: Mod[];
    community: string;
    ignoredUpdates: any[];
}

function isProfileDataValid(profileData: string): boolean {
    return profileData.startsWith(PROFILE_DATA_PREFIX);
}

async function decodeAndExtractProfile(profileData: string): Promise<AdmZip> {
    if (!isProfileDataValid(profileData)) {
        throw new Error("Invalid profile data - missing #r2modman prefix");
    }

    const b64 = profileData.substring(PROFILE_DATA_PREFIX.length).trim();
    const decoded = Buffer.from(b64, "base64");
    return new AdmZip(decoded);
}

const proxState = new Proxy({mods: []}, {
    get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver);
    },
    set(target: {}, p: string | symbol, newValue: any, receiver: any): boolean {
        target[p] = newValue;
        return true;
    }
})

export default {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Search for a specific modpack on thunderstore")
        .addStringOption(op => op
            .setName("code")
            .setDescription("UUID/modpack code")
            .setRequired(true)
        ),

    permissionCheck: () => ({result: true}),

    components: {
        selectMod: {
            customId: 'select_mod',
            async execute(client: Client, interaction: StringSelectMenuInteraction): Promise<void> {
                const select = interaction.values[0]!.split('-')
                const sourcePage = await fetch(`https://thunderstore.io/c/repo/p/${select[0]}/${select[1]}/source`)
                const text = await sourcePage.text();
                const $ = cheerio.load(text);

                const preContent = $('pre').text();

                const attachment = new AttachmentBuilder(Buffer.from(preContent), {
                    name: `${select[1]}-source.cs`
                });

                const modal = new ModalBuilder()
                    .setCustomId(`search_source_${select[0]}_${select[1]}`)
                    .setTitle(`Search ${select[1]}`);

                const searchInput = new TextInputBuilder()
                    .setCustomId('search_query')
                    .setLabel('What do you want to search for?')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(searchInput));
                await interaction.showModal(modal);
            },
        },
        searchSource: {
            customId: 'search_source',
            async execute(client: Client, interaction: ModalSubmitInteraction): Promise<void> {
                const [, repo, modName] = interaction.customId.split('_');
                const searchQuery = interaction.fields.getTextInputValue('search_query');

                console.log(searchQuery);

                const sourcePage = await fetch(`https://thunderstore.io/c/repo/p/${repo}/${modName}/source`)
                const text = await sourcePage.text();
                const $ = cheerio.load(text);
                const preContent = $('pre').text();

                const searchInSource = (content: string, query: string, context = 2) => {
                    const lines = content.split('\n');
                    const results = [];

                    lines.forEach((line, index) => {
                        if (line.toLowerCase().includes(query.toLowerCase())) {
                            const start = Math.max(0, index - context);
                            const end = Math.min(lines.length, index + context + 1);
                            const snippet = lines.slice(start, end).join('\n');

                            results.push({
                                lineNumber: index + 1,
                                snippet: snippet
                            });
                        }
                    });

                    return results;
                };

                const results = searchInSource(preContent, searchQuery);

                if (results.length === 0) {
                    await interaction.reply({
                        content: `No matches found for "${searchQuery}".`,
                        ephemeral: true
                    });
                    return;
                }

                const resultText = results
                    .slice(0, 5)
                    .map(r => `**Line ${r.lineNumber}:**\n\`\`\`cs\n${r.snippet}\n\`\`\``)
                    .join('\n\n');

                await interaction.reply({
                    content: `Found ${results.length} match(es) for "${searchQuery}":\n\n${resultText}`,
                    ephemeral: true
                });
            }
        }
    },



    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        const profileCode = interaction.options.getString("code");

        if (!profileCode) {
            await interaction.reply({
                content: "Not a valid profile code",
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        try {
            const response = await fetch(
                `https://thunderstore.io/api/experimental/legacyprofile/get/${profileCode}/`
            );

            if (!response.ok) {
                await interaction.editReply({
                    content: `Failed to fetch profile: ${response.status} ${response.statusText}`
                });
                return;
            }

            const data = await response.text();
            const zip = await decodeAndExtractProfile(data);
            const zipEntries = zip.getEntries();

            const yamlEntry = zipEntries.find((entry: { entryName: string; }) =>
                entry.entryName.endsWith('.r2x') ||
                entry.entryName.endsWith('.yml') ||
                entry.entryName.endsWith('.yaml')
            );

            if (!yamlEntry) {
                await interaction.editReply({
                    content: "No YAML profile file found in the archive. Is this a valid import code?"
                });
                return;
            }

            const yamlContent = yamlEntry.getData().toString('utf-8');
            const profileData = yaml.load(yamlContent) as ProfileData;

            const enabledMods = profileData.mods.filter(mod => mod.enabled);

            /*const jsonData = enabledMods.map(mod => ({
                name: mod.name,
                version: `${mod.version.major}.${mod.version.minor}.${mod.version.patch}`,
                enabled: enabledMods.includes(mod),
            }))

            const JSONFile = new AttachmentBuilder(Buffer.from(JSON.stringify(jsonData, null, 2)), {name: 'mods.json'})*/

            const textContent = enabledMods.map(mod =>
                `${mod.name}, ${mod.version.major}.${mod.version.minor}.${mod.version.patch}`
            ).join('\n');

            const TextFile = new AttachmentBuilder(
                Buffer.from(textContent, 'utf-8'),
                {name: 'mods.txt'}
            );

            const b64 = data.substring(PROFILE_DATA_PREFIX.length).trim();
            const zipBuffer = Buffer.from(b64, "base64");

            const ZipFile = new AttachmentBuilder(
                zipBuffer,
                {name: `${profileData.profileName.replace(/\s+/g, '_')}.r2z`}
            );

            const components = new StringSelectMenuBuilder()
                .setCustomId('select_mod')
                .setPlaceholder("Select a mod!")
                .addOptions(enabledMods.splice(0, 25).map(x => new StringSelectMenuOptionBuilder().setLabel(x.name).setDescription("Search the source?").setValue(x.name)))

            await interaction.editReply({
                embeds: [
                    buildEmbed(
                        <Embed color={0x5865F2} title={`Profile ${profileData.profileName}`}>
                            <Field inline={true} name={"Total Mods"} value={profileData.mods.length.toString()}/>
                            <Field inline={true} name={"Enabled Mods"} value={enabledMods.length.toString()}/>
                            <Footer text={`Profile Code: ${profileCode}`}/>
                        </Embed>
                    )
                ],
                //components: [components],
                components: [new ActionRowBuilder().addComponents(components)],
                files: [TextFile, ZipFile],
            });


        } catch (error) {
            console.error('Error processing profile:', error);
            await interaction.editReply({
                content: `Error processing profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
}