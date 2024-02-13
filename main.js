const bot = require("discord.js-selfbot-v13");
const prompt = require("prompt-sync")({ sigint: true });
const fs = require("node:fs");
const { notify } = require('node-notifier');

var cfg = { //Example config
    "token": "",
    "channel_id": "",
    "prefix": ".",
    "pokemonFilter": ["​​Greninja"],
    "autocatch": {
        "type": "pokeball",
        "amount": 5
    },
    "options": {
        "detectShiny": true,
        "detectPokemon": true,
        "randomMoveIfFailed": true,
        "autoCatch": false,
        "showSummary": true,
        "autoEvolve": false
    }
}
// Utils
function savecfg(){
    if(cfg){
        fs.open("./config.json", "w", (_, f) => {
            fs.write(f, JSON.stringify(cfg, null, 2), ()=>{});
            fs.close(f, ()=>{});
        });
    }
}

function randint(min=0, max=1, exclude=[]) {
    var r = Math.floor(Math.random() * (max - min) + min);
    while(exclude.some(e=>e==r)){
        r = Math.floor(Math.random() * (max - min) + min);
    }
    return r;
}

try {
    let td = fs.readFileSync("./config.json", {encoding: "utf8", "flag": "r"});
    if(td){
        cfg = JSON.parse(td);
    } else {
        throw new Error();
    }
}
catch {
        console.log("Config Not Found!");
        cfg.token = prompt("Enter Your Token: ").replace(" ", "");
        cfg.channel_id = prompt("Enter Channel ID: ").replace(" ", "");
        savecfg(cfg);
}

function objToMsg(title, obj){
    let s = "> ## " + title;
    for(let i of Object.keys(obj)){
        s += `\n> **${i}:** \`${obj[i]}\``;
    }
    return s;
}

async function retry(f, t, el = "Failed to execute function, retrying...") {
    let rt = 0;
    while (rt < t) {
        try {
            await (f)();
            return true;
        } catch {
            rt += 1;
            console.log(el, `[${rt}]`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return false;
}

const client = new bot.Client();

const BUTTON_CLICKED_FAILED = "Failed to click the button, retrying...",
    SLASH_SEND_FAILED = "Failed to send slash command, retrying...",
    MYUU_BOT_ID = "438057969251254293";

var isStart = false,
    mc, bmove, routeNum, currentPokemon, evolveMsgId,
    finishBattle = true,
    foundPokemon = false,
    trainerBattle = false,
    throwTime = 1;

var summary = {
    battleCount: 0,
    foundPokemonCount: 0,
    foundPokemons: []
}

client.on('ready', async () => {
    console.clear();
    console.log(`${client.user.username} is ready!`);
    mc = client.channels.cache.get(cfg.channel_id);
});

client.on("messageCreate", function(msg) {
    if(msg.author.id == client.user.id){
        var args = msg.content.split(" ");
        if(args[0].startsWith(cfg.prefix)){
            let scmd = args[0].slice(cfg.prefix.length);
            switch(scmd){
                //MAIN COMMAND
                case "route":
                    if(!isStart){
                        if(args[2] && 0 < Number(args[2]) < 5){
                            isStart = true;
                            Object.keys(summary).forEach((k)=>{
                                if(k&&k.constructor){
                                    switch(k.constructor){
                                        case Array:
                                            summary[k] = [];
                                        case Number:
                                            summary[k] = 0;
                                        case Object:
                                            summary[k] = {}
                                    }
                                }
                            });
                            bmove = Number(args[2])-1;
                            routeNum = args[1]
                            msg.channel.send(`> **[Myuu]** _Started at <#${cfg.channel_id}>!_`);
                            console.log(`Started!`);
                            mc.sendSlash(MYUU_BOT_ID, "route", routeNum);
                        } else {
                            msg.channel.send("> _Please choose vaild move (1 - 4)_");
                        }
                    } else {
                        isStart = false;
                        s = "> **[+]** _Stopped!_";
                        if(cfg.options.showSummary){
                            s += `
> ## Summary:
> **+) Total battle:** ${summary.battleCount}
> **+) Found shiny/filtered:** ${summary.foundPokemonCount}
> **+) Found pokemons:** ${summary.foundPokemons.join(", ")}`
                        }
                        msg.channel.send(s);
                        console.log(`[+] Stopped!`);
                    }
                    msg.delete();
                    break;
                
                case "setchannel":
                    if(args[1]){
                        cfg.channel_id = args[1].trim();
                        savecfg();
                        msg.channel.send("> _Changed Channel to_ <#" + cfg.channel_id + ">");
                        console.log("Changed Channel ID to " + cfg.channel_id);
                        mc = client.channels.cache.get(cfg.channel_id);
                    } else {
                        msg.channel.send("> _Please provide Channel ID!_")
                    }
                    msg.delete();
                    break;

                case "pkfilter":
                    switch(args[1]){
                        case "":
                        case undefined:
                        case "list":
                            msg.channel.send(`> Filter List: \`${cfg.pokemonFilter.join(", ")}\``);
                            break;
                        
                        case "add":
                            var pks = args.slice(2);
                            cfg.pokemonFilter = cfg.pokemonFilter.concat(pks);
                            savecfg();
                            msg.channel.send(`> Added \`${pks.join(", ")}\``);
                            break;

                        case "remove":
                        case "del":
                            var pks = args.slice(2);
                            for(let i of pks){
                                if(cfg.pokemonFilter.indexOf(i) != -1){
                                    cfg.pokemonFilter.splice(cfg.pokemonFilter.indexOf(i), 1);
                                }
                            }
                            savecfg();
                            msg.channel.send(`> Removed \`${pks.join(", ")}\``);
                            break;
                    }
                    msg.delete();
                    break;

                case "autocatch":
                    switch(args[1]){
                        case "":
                        case undefined:
                        case "info":
                            msg.channel.send(objToMsg("Auto Catch Info", cfg.autocatch));
                        break;

                        case "set":
                            if(cfg.autocatch[args[2]] && args[3]){
                                cfg.autocatch[args[2]] = args[3];
                                savecfg();
                                msg.channel.send(`> Set new **${args[2]}**'s value to \`${args[3]}\``)
                            } else {
                                msg.channel.send("> No option found!");
                            }
                            break;
                    }
                    msg.delete();
                    break;
                
                case "toggle":
                    if(cfg.options[args[1]]!=undefined){
                        cfg.options[args[1]] = !cfg.options[args[1]];
                        savecfg();
                        msg.channel.send(`> **Toggled** _${args[1]}_ to \`${cfg.options[args[1]]}\``);
                    } else {
                        msg.channel.send(objToMsg("Bot Options", cfg.options));
                    }
                    msg.delete();
                    break;
                
                //OTHER COMMAND
                case "help":
                    msg.channel.send(`> ### Help Page
> ## Command List
> **${cfg.prefix}route** _routeNumber_ _move_
> \\- Auto routing -
> **${cfg.prefix}toggle** _option?_
> \\- Toggle an option (ex: detectShiny). -
> **${cfg.prefix}pkfilter** list/add/del _pokemonName?_
> \\- Pokemon filter manager (list doesn't need argument) -
> **${cfg.prefix}autocatch** info/set _option?_
> \\- Auto catch pokemon manager -
> **${cfg.prefix}help**
> \\- Help Page -
> **${cfg.prefix}setchannel** _channelId_
> \\- Set new channel for route command -
> **${cfg.prefix}prefix**
> \\- Show/Set current bot prefix -`);
                    msg.delete();
                    break;
                
                case "prefix":
                    if(args[1]){
                        cfg.prefix = args[1];
                        savecfg();
                        msg.channel.send(`> Set prefix to \`${args[1]}\``);
                    } else {
                        msg.channel.send(`> **Bot prefix:** \`${cfg.prefix}\``);
                    }
                    msg.delete();
                    break;
            }
        }
    }
    if(isStart){
        if(msg.author.id == MYUU_BOT_ID && msg.channelId == cfg.channel_id){
            if(msg.embeds.length > 0){
                let c = msg.embeds[0];
                if(msg.components.length > 0 && ((c.footer && c.footer.text.includes("Click a move number")) || (c.description && c.description.includes("A wild") || (c.author && c.author.name.includes("Vs."))))){
                    finishBattle = false;
                    if(c.description&&c.description.includes("**")){
                        summary.battleCount += 1;
                        currentPokemon = c.description.split("**").filter(s=>s.includes("Lv"))[0];
                        console.log(`Enemy ${summary.battleCount}:`, currentPokemon);
                    }
                    if(c.footer&&c.footer.text.includes("Opponent's team")){
                        trainerBattle = true;
                    }
                    if(cfg.options.autoCatch && foundPokemon){
                        if(throwTime < Number(cfg.autocatch.amount) && !finishBattle){
                            throwTime += 1
                            console.log(`Catching pokemon... [${throwTime}/${cfg.autocatch.amount}]`)
                            setTimeout(()=>{
                                retry(()=>mc.sendSlash(MYUU_BOT_ID, "throw", cfg.autocatch.type), 3, SLASH_SEND_FAILED);
                            }, 1500);
                        } else {
                            mc.send(`<@${client.user.id}>`).then(e=>{
                                e.markUnread();
                                notify({
                                    title: "Failed to catch pokemon",
                                    message: `Failed to catch ${currentPokemon}!`
                                });
                            });
                        }
                    }
                    let detector = c.author && !trainerBattle && ((c.author.name.includes("★") && cfg.options.detectShiny) || (cfg.pokemonFilter.some(e=>c.author.name.toLocaleLowerCase().includes(e.toLowerCase())) && cfg.options.detectPokemon));
                    if(!foundPokemon && detector){
                        summary.foundPokemonCount += 1;
                        summary.foundPokemons.push(currentPokemon);
                        console.log(`Shiny/Filtered Pokemon "${currentPokemon}" Detected!`);
                        foundPokemon = true;
                        throwTime = 1;
                        mc.send(`<@${client.user.id}>`).then(e=>{
                            e.markUnread();
                            notify({
                                title: "Pokemon detected!",
                                message: `Shiny/Filtered Pokemon "${currentPokemon}" Detected!`
                            });
                        });
                        if(cfg.options.autoCatch){
                            console.log(`Trying to catch pokemon... [${throwTime}/${cfg.autocatch.amount}]`);
                            setTimeout(()=>{
                                retry(()=>mc.sendSlash(MYUU_BOT_ID, "throw", cfg.autocatch.type), 3, SLASH_SEND_FAILED);
                            }, 1500);
                        }
                    } else if (!detector) {
                        let b = msg.components[0].components;
                        if(b[bmove]&&b[bmove].type == "BUTTON"){
                            setTimeout(()=>retry(()=>msg.clickButton(b[bmove].customId), 3, BUTTON_CLICKED_FAILED).then((e)=>{
                                if(!e){
                                    if(cfg.options.randomMoveIfFailed){
                                        retry(()=>msg.clickButton(b[randint(0, b.length-1, [bmove])].customId), 3, BUTTON_CLICKED_FAILED);
                                    } else {
                                        console.log("Failed to do move, required user action...");
                                        notify({
                                            title: "Button not respond!",
                                            message: "Failed to do move, required user action..."
                                        });
                                    }
                                }
                            }), 500);
                        }
                    }
                } else if(c.author && ["battle ended", "battle has ended"].some((e)=>c.author.name.includes(e))){
                    finishBattle = true;
                    foundPokemon = false;
                    trainerBattle = false;
                    if(msg.components.length > 0 && msg.components[0].components[0].type == "BUTTON" && msg.components[0].components[0].label == "Back To The Future"){
                        setTimeout(()=>{
                            retry(()=>msg.clickButton(msg.components[0].components[0].customId), 3, BUTTON_CLICKED_FAILED).then((e)=>{
                                if(!e)retry(()=>mc.sendSlash(MYUU_BOT_ID, "route", routeNum), 3, SLASH_SEND_FAILED);
                            });
                        }, 1000);
                    } else {
                        if(c.description && c.description.includes("have caught")){
                            console.log("Catch pokemon successfully!");
                        }
                        setTimeout(()=>{
                            retry(()=>mc.sendSlash(MYUU_BOT_ID, "route", routeNum), 3, SLASH_SEND_FAILED);
                        }, 1000);
                    }
                } else if(((((c.title && c.title.includes("in a battle")) || (c.description && c.description.includes("You are currently engaged in a"))) && finishBattle) || (c.title && c.title.toLowerCase().includes("time is up!")))){
                    setTimeout(()=>{
                        retry(()=>mc.sendSlash(MYUU_BOT_ID, "route", routeNum), 3, SLASH_SEND_FAILED);
                    }, 2000);
                } else if(c.footer && c.footer.text.includes("Do you want to evolve")){
                    if(msg.components.length > 0){
                        evolveMsgId = msg.id;
                        msg.clickButton(msg.components[0].components.filter(b=>b.label == (cfg.options.autoEvolve ? "Yes" : "No"))[0].customId);
                    }
                }
            }
        }
    }
});

client.on("messageUpdate", function(_, msg){
    if(isStart && msg.channelId == cfg.channel_id){
        if(msg.id == evolveMsgId){
            setTimeout(()=>{
                retry(()=>mc.sendSlash(MYUU_BOT_ID, "route", routeNum), 3, SLASH_SEND_FAILED);
            }, 1000);
        }
    }
});

client.login(cfg.token);
