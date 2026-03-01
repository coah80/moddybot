import logger = require("node-color-log");
import * as fs from "fs";
import * as path from "path";

const LOG_FILE = path.resolve(__dirname, "../moddy.log");

function writeToFile(level: string, prefix: string, args: any[]): void {
    const timestamp = new Date().toISOString();
    const message = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    const line = `[${timestamp}] [${level}] [${prefix}]: ${message}\n`;
    fs.appendFileSync(LOG_FILE, line, "utf8");
}

class Logger {
    readonly prefix: string = "";

    constructor(parent: string) {
        this.prefix = parent;
    }

    log(...args: any[]): any {
        logger.color("green");
        logger.log(`[${this.prefix}]:`, ...args);
        writeToFile("LOG", this.prefix, args);
    }

    err(...args: any[]): any {
        logger.color("red");
        logger.log(`[${this.prefix}]:`, ...args);
        writeToFile("ERR", this.prefix, args);
    }

    warn(...args: any[]): any {
        logger.color("yellow");
        logger.log(`[${this.prefix}]:`, ...args);
        writeToFile("WARN", this.prefix, args);
    }
}

export const LogAPI = new Logger("MODDY");