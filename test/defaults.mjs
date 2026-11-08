/*
 * AI Translate for Telegram — do the defaults still match the plugin's?
 *
 * src/storage.ts writes the defaults out by hand, because the settings page
 * they come from, ai-translate/settings.ts, is Vencord's and cannot be
 * imported. Nothing else notices when the two drift: a setting missing here
 * is simply undefined, which reads as off. So the page is bundled with
 * Vencord's imports replaced by stubs, as ai-translate's own test/defaults.mjs
 * does it, and every setting is compared.
 *
 * Run it:  node test/defaults.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { built, check, done, findEsbuild, ROOT } from "./lib.mjs";

/** Settings this script does without, each with the reason; a new one cannot join by accident. */
const NOT_HERE = {
    updateChannel: "the userscript manager keeps the script current, from the address in its header",
    lastUpdateCheck: "the same",
    aiLearn: "AI Learn is not part of the Telegram script",
    learnHistory: "nothing here writes corrections to keep",
    showOriginal: "nothing is drawn under a sent message: the clients redraw their messages and it would vanish",
    apiKey: "the single key from before there were several, migrated and then left empty",
    model: "the single model from the same time"
};

/** Settings that differ here on purpose. */
const DIFFERENT = {
    useContext: [false, "other people's messages would go to the provider with every request, so it waits to be switched on"]
};

const esbuild = await findEsbuild();
const out = await mkdtemp(join(tmpdir(), "ai-translate-telegram-defaults-"));

const STUBS = {
    "@api/Settings": "export const definePluginSettings = definitions => ({ definitions, store: {} });\nexport const Settings = { plugins: {} };\n",
    "@utils/types": "export const OptionType = new Proxy({}, { get: (_, name) => name });\n"
};

await esbuild.build({
    entryPoints: [join(ROOT, "ai-translate", "settings.ts")],
    outfile: join(out, "settings.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    plugins: [{
        name: "stubs",
        setup(build) {
            build.onResolve({ filter: /^(@|\.\/ui\/)/ }, args => ({ path: args.path, namespace: "stub" }));
            build.onLoad({ filter: /.*/, namespace: "stub" }, args => ({
                contents: STUBS[args.path]
                    ?? "export default new Proxy({}, { get: () => () => null });\n"
                    + "export const KeepHelp = () => null;\nexport const LearnPanel = () => null;\n"
                    + "export const LogsPanel = () => null;\nexport const Providers = () => null;\n"
                    + "export const UpdatePanel = () => null;\nexport const sectionTitle = () => () => null;\n",
                loader: "js"
            }));
        }
    }]
});

const { settings } = await import(join(out, "settings.mjs"));
const { DEFAULTS } = await built(`export { DEFAULTS } from "./src/storage";\n`);

for (const [name, definition] of Object.entries(settings.definitions)) {
    if (definition.type === "COMPONENT") continue;

    if (name in NOT_HERE) {
        check(`${name} is left out on purpose: ${NOT_HERE[name]}`, name in DEFAULTS, false);
        continue;
    }

    if (name in DIFFERENT) {
        check(`${name} is ${JSON.stringify(DIFFERENT[name][0])} here on purpose: ${DIFFERENT[name][1]}`, DEFAULTS[name], DIFFERENT[name][0]);
        continue;
    }

    check(`${name} defaults to the same as in the plugin`, DEFAULTS[name], definition.default);
}

for (const name of Object.keys(DEFAULTS))
    if (!(name in settings.definitions)) check(`${name} is still a setting of the plugin`, false, true);

done();
