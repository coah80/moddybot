import {
    type ChatInputCommandInteraction,
    type Client,
    type AutocompleteInteraction,
    SlashCommandBuilder,
} from "discord.js";
import type { Command } from "@/types/index.ts";

const BASE_URL = 'https://repomods.com';

interface Page {
    id: string;
    label: string;
    path: string;
    category: 'global' | 'api' | 'sdk' | 'thunderstore';
}

const PAGES: Page[] = [
    // Global
    { id: 'overview', label: 'Overview', path: '/overview.html', category: 'global' },
    { id: 'develop', label: 'Develop', path: '/develop.html', category: 'global' },
    { id: 'harmonyx', label: 'HarmonyX', path: '/harmonyx.html', category: 'global'},
    { id: 'unity', label: 'Unity', path: '/unity.html', category: 'global'},

    // API
    { id: 'api_get_started', label: 'API Get Started', path: '/apis/repolib/api/start.html', category: 'api' },
    { id: 'api_bundle_loading', label: 'API Bundle Loading', path: '/apis/repolib/api/bundles.html', category: 'api' },
    { id: 'api_mixer_groups', label: 'API Mixer Groups', path: '/apis/repolib/api/audio-mixer-groups.html', category: 'api' },
    { id: 'api_commands', label: 'API Commands', path: '/apis/repolib/api/commands.html', category: 'api' },
    { id: 'api_enemies', label: 'API Enemies', path: '/apis/repolib/api/enemies.html', category: 'api' },
    { id: 'api_items', label: 'API Items', path: '/apis/repolib/api/items.html', category: 'api' },
    { id: 'api_network_events', label: 'API Network Events', path: '/apis/repolib/api/network-events.html', category: 'api' },
    { id: 'api_network_prefabs', label: 'API Network Prefabs', path: '/apis/repolib/api/network-prefabs.html', category: 'api' },
    { id: 'api_valuables', label: 'API Valuables', path: '/apis/repolib/api/valuables.html', category: 'api' },

    // SDK
    { id: 'sdk_start', label: 'SDK Get Started', path: '/apis/repolib/sdk/start.html', category: 'sdk' },
    { id: 'sdk_custom_scripts', label: 'SDK Custom Scripts', path: '/apis/repolib/sdk/custom-scripts.html', category: 'sdk' },
    { id: 'sdk_enemies', label: 'SDK Enemies', path: '/apis/repolib/sdk/enemies.html', category: 'sdk' },
    { id: 'sdk_levels', label: 'SDK Levels', path: '/apis/repolib/sdk/levels.html', category: 'sdk' },
    { id: 'sdk_items', label: 'SDK Items', path: '/apis/repolib/sdk/items.html', category: 'sdk' },
    { id: 'sdk_valuables', label: 'SDK Valuables', path: '/apis/repolib/sdk/valuables.html', category: 'sdk' },

    // Thunderstore
    { id: 'thunderstore_start', label: 'Thunderstore Overview', path: '/thunderstore/start.html', category: 'thunderstore' },
    { id: 'thunderstore_publish', label: 'Thunderstore Publish', path: '/thunderstore/publish.html', category: 'thunderstore' },
];

const findPageById = (id: string): Page | undefined => {
    return PAGES.find(page => page.id === id);
};

const buildUrl = (path: string): string => {
    return `${BASE_URL}${path}`;
};

export default {
    data: new SlashCommandBuilder()
        .setName('guide')
        .setDescription('Replies with a link to a wiki of REPO modding.')
        .addStringOption(option => option
            .setName('page')
            .setDescription('The wiki page to view')
            .setRequired(true)
            .setAutocomplete(true)
        ),

    permissionCheck: () => ({ result: true }),

    async autocomplete(client: Client, interaction: AutocompleteInteraction) {
        const focusedValue = interaction.options.getFocused(true).value.toLowerCase();

        const filtered = PAGES
            .filter(page => page.label.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(page => ({
                name: page.label,
                value: page.id,
            }));

        await interaction.respond(filtered);
    },

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        const pageId = interaction.options.getString('page', true);
        const page = findPageById(pageId);

        if (!page) {
            await interaction.reply({
                content: '❌ Page not found.',
                ephemeral: true,
            });
            return;
        }

        const url = buildUrl(page.path);
        await interaction.reply({
            content: url,
        });
    },
}