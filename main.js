const bot = require('discord.js-selfbot-v13');
const fs = require('node:fs');

var cfg = { //Example config
    "token": "",
    "channel_id": "",
    "pokemonFilter": ["​​Greninja-Ash"],
    "options": {
        "detectShiny": true,
        "detectPokemon": true
    }
}
// Utils
function savecfg(){
    fs.open("./config.json", "w", (_, f) => {
        fs.write(f, JSON.stringify(cfg, null, 2), ()=>{});
        fs.close(f, ()=>{});
    });
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

async function retry(f, t, el = "Failed to execute function, retrying...") {
    let rt = 0;

    while (rt < t) {
        try {
            await (f)();
            break;
        } catch {
            rt += 1;
            console.log(el, `[${rt}]`);
        }
    }
}

const client = new bot.Client();

const pfx = ".";
var isStart = false,
    mc, bmove, routeNum;

function stopL(){
    isStart = false;
}

client.on('ready', async () => {
    console.clear();
    console.log(`${client.user.username} is ready!`);
    mc = client.channels.cache.get(cfg.channel_id);
});

client.on("messageCreate", async function(msg) {
    if(msg.author.id == client.user.id){
        var args = msg.content.split(" ");
        if(args[0][0] == pfx){
            let scmd = args[0].slice(1);
            switch(scmd){
                //MAIN COMMAND
                case "route":
                    if(!isStart){
                        if(args[2] && 0 < Number(args[2]) < 5){
                            isStart = true;
                            bmove = Number(args[2]);
                            routeNum = args[1]
                            msg.channel.send(`> **[Myuu]** _Started at <#${cfg.channel_id}>!_`);
                            console.log(`Started!`);
                            mc.sendSlash("438057969251254293", "route", routeNum);
                        } else {
                            msg.channel.send("> _Please choose vaild move (1 - 4)_");
                        }
                    } else {
                        stopL();
                        msg.channel.send(`> **[+]** _Stopped!_`);
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
                        case "list":
                            msg.channel.send(`> Filter List: \`${cfg.pokemonFilter.join(", ")}\``);
                            break;
                        
                        case "add":
                            var pks = args.slice(2);
                            cfg.pokemonFilter = cfg.pokemonFilter.concat(pks);
                            savecfg();
                            msg.channel.send(`> Added \`${pks.join(", ")}\``)
                            break;

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
                
                case "toggle":
                    if(cfg.options[args[1]]!=undefined){
                        cfg.options[args[1]] = !cfg.options[args[1]];
                        savecfg();
                        msg.channel.send(`> **Toggled** _${args[1]}_`);
                    } else {
                        let s = "> ## Options"
                        for(let i of Object.keys(cfg.options)){
                            s += `\n> **${i}**: ${cfg.options[i]}`
                        }
                        msg.channel.send(s);
                    }
                    msg.delete();
                    break;
                
                //OTHER COMMAND
                case "help":
                    msg.channel.send(`> ### Help Page
> ## Command List
> **${pfx}route** _routeNumber_ _move_
> \\- Auto routing -
> **${pfx}help**
> \\- Help Page -
> **${pfx}setchannel** _channelId_
> \\- Set new channel for route command -
> **${pfx}toggle** _option_
> \\- Toggle an option (ex: detectShiny). Leave empty for list of options -
> **${pfx}pkfilter** list/add/del (pokemonName?)
> \\- Pokemon Filter Manager (list doesn't need argument.) -
`);
                    msg.delete();
                    break;
            }
        }
    }
    if(isStart){
        if(msg.author.id == "438057969251254293" && msg.channelId == cfg.channel_id){
            if(msg.embeds.length > 0){
                let c = msg.embeds[0];
                if(msg.components.length > 0 && ((c.footer && c.footer.text.includes("Click a move number")) || (c.description && c.description.includes("A wild")))){
                    if(c.description&&c.description.includes("**"))console.log("Enemy:", c.description.split("**")[1]);
                    if((c.author.name.includes("★") && cfg.options.detectShiny) || (cfg.pokemonFilter.some(e=>c.author.name.includes(e)) && cfg.options.detectPokemon)){
                        console.log("Shiny/Filtered Pokemon Detected!");
                        mc.send(`<@${client.user.id}>`).then(e=>{
                            e.markUnread();
                        });
                    } else {
                        let b = msg.components[0].components;
                        if(b[bmove]&&b[bmove].type == "BUTTON"){
                            setTimeout(()=>retry(()=>msg.clickButton(b[bmove-1].customId), 3, "Failed to click the button, retrying..."), 5000)
                        }
                    }
                } else if(c.author && c.author.name == "Wild battle has ended!"){
                    if(msg.components.length > 0 && msg.components[0].components[0].type == "BUTTON" && msg.components[0].components[0].label == "Back To The Future"){
                        setTimeout(()=>msg.clickButton(msg.components[0].components[0].customId).catch(()=>retry(()=>mc.sendSlash("438057969251254293", "route", routeNum), 3, "Failed to send slash command, retrying...")), 1000);
                    }
                }
            }
        }
    }
});
client.login(cfg.token);
