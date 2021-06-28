import {Message, MessageEmbed, PermissionResolvable, TextChannel} from 'discord.js';
import {ICommand} from '../../../utils/types';
import {Client} from 'pg';
import {getChannelFromMention, getRoleFromMention, timeout} from '../../../utils/helpers';
import {textChannelPermissions, textChannelPermissionsEnable, textChannelPermissionDisable} from '../../../utils/information';

const command: ICommand = {
    name: 'changetextpermissions',
    description: 'Changes the given role\'s permissions in a text channel according to the changes given. Permissions are referred to by their number (see f!listpermissions). You can change permissions by specifiying an operation and a permission number. Operation can be + for add, - for remove, or just r (with nothing after) for resetting permissions. E.g. to allow CREATE_INSTANT_INVITE and MANAGE_MESSAGES on a role for a certain text channel, simply give the command: f!changetextpermissions @role #text-channel +1 +7',
    alias: ['ctp', 'changetextperms'],
    syntax: 'f!changetextpermissions [role mention or number] [text channel mention] [permission changes, (+/-/r)(permission number)]',
    async execute(message: Message, _con: Client, args?: string[]) {
        console.log(`Command changetextpermissions started by user ${message.member!.user.tag} in guild ${message.guild!.name}.`);

        const outputEmbed = new MessageEmbed() // create a new embed for output
            .setColor('#FFFCF4')
            .setTitle('Change Text Permissions - Report');

        let outputEmbedText = '';

        if (!message.member!.hasPermission('MANAGE_CHANNELS')) { // check for adequate permissions
            try {
                console.log('Insufficient permissions. Stopping execution.')
                return await message.reply('sorry, you need to have the `MANAGE_CHANNELS` permission to use this command.');
            } catch (e) {
                console.log(`There was an error sending a message in the guild ${message.guild}! The error message is below:`);
                console.log(e);
                return;
            }
        }

        if (!args || args.length < 3) { // check if the args exist (this function requires them) and that there are not too many args
            try {
                console.log('Incorrect syntax given. Stopping execution.');
                return await message.channel.send(`Incorrect syntax! Correct syntax: \`${this.syntax}\``)
            } catch (e) {
                console.log(`There was an error sending a message in the guild ${message.guild}! The error message is below:`);
                console.log(e);
                return;
            }
        }

        const roleMention = args!.shift(); // find the mention of the role numbers in the args
        const channelMention = args.shift(); // get the channel mention

        let role; // declare role object, to be determined later using logic below

        if (isNaN(parseInt(roleMention!))) { // if the arg is a mention and not a number
            console.log('Role is of type mention. Getting role from role cache.')
            role = getRoleFromMention(message, roleMention!); // then get it from the role cache
        } else {
            console.log('Role is of type number. Getting role using position.')
            role = message.guild!.roles.cache.get(message.guild!.roles.cache.map(r => r.id)[parseInt(roleMention!) - 1]); // else find the role by its position number
        }

        if (!role) { // check if the role supplied was valid 
            console.log('Role supplied was invalid. Stopping execution.');
            try {
                return await message.channel.send('Invalid role!');
            } catch (e) {
                console.log(`There was an error sending a message in the guild ${message.guild}! The error message is below:`);
                console.log(e);
                return;
            }
        }


        const textChannel = getChannelFromMention(message, channelMention!); // attempt to get a channel from the mention

        if (!textChannel) { // check if the role supplied was valid 
            console.log('Text channel supplied was invalid. Stopping execution.');
            try {
                return await message.channel.send('Invalid text channel!');
            } catch (e) {
                console.log(`There was an error sending a message in the guild ${message.guild}! The error message is below:`);
                console.log(e);
                return;
            }
        }


        for (const permissionChange of args) { // iterate through the rest of the args to calculate and apply the permission changes
            const operation = permissionChange.charAt(0); // get the operation (first character of the sequence)
            const permissionToChange = permissionChange.slice(1).toUpperCase(); // slice the operation off the argument to get the permission number

            if (!(operation === '+' || operation === '-' || operation === 'r')) {
                console.log(`Invalid operation was given for a permission change. Skipping over it.`);
                outputEmbedText += `**${permissionChange}:** Invalid operation`;
                continue;
            }

            if (operation !== 'r') { // if the operation is not reset, it is add or remove
                console.log('Operation is not reset.');
                console.log('Attempting to find permission number in text channel permissions.')

                const permissionNum = parseInt(permissionToChange, 10); // attempt to get a number from the permission
                let permission;

                if (isNaN(permissionNum)) { // if the permission is not a number, check to see if it a valid permissions
                    console.log('Permission given is of type string. Checking permission validity.');
                    if (!(textChannelPermissions.includes(permissionToChange as PermissionResolvable))) {
                        console.log(`Invalid permission was given for a permission change. Skipping over it.`);
                        outputEmbedText += `**${permissionChange}:** Invalid permission.\n`;
                        continue;
                    }
                    permission = permissionToChange; // set the permission to the value the user gave, as it is a valid permission
                } else { // if it is a number, check in the list of permissions to get the matching permission
                    console.log('Permission given is of type number. Checking permission validity.');
                    if (permissionNum < 1 || permissionNum > textChannelPermissions.length) { // check if the value for permission is actually within the range of the general permissions
                        console.log(`Invalid permission was given for a permission change. Skipping over it.`);
                        outputEmbedText += `**${permissionChange}:** Invalid permission.\n`;
                        continue;
                    }
                    permission = textChannelPermissions[permissionNum - 1]; // get the permission name from the list using index
                }


                switch (operation) { // do different things depending on the operation
                    case '+':
                        try {
                            await timeout(300); // setting a short timeout to prevent abuse of Discord's API
                            await (textChannel as TextChannel).updateOverwrite(role, textChannelPermissionsEnable.get((permission as PermissionResolvable))); // add the permission given
                            console.log(`Successfully added permission ${permission.toString()} to role ${role.name}.`);
                            outputEmbedText += `**${permission}**: Permission added successfully\n`
                        } catch (e) {
                            console.log(`Failed to add permission ${permission.toString()} to role ${role.name}.`);
                            outputEmbedText += `**${permission}**: Failed to add permission\n`
                        }
                        break;
                    case '-':
                        try {
                            await timeout(300); // setting a short timeout to prevent abuse of Discord's API
                            await (textChannel as TextChannel).updateOverwrite(role, textChannelPermissionDisable.get((permission as PermissionResolvable))); // remove the permission given
                            console.log(`Successfully removed permission ${permission.toString()} from role ${role.name}.`);
                            outputEmbedText += `**${permission}**: Permission removed successfully\n`
                        } catch (e) {
                            console.log(`Failed to remove permission ${permission.toString()} from role ${role.name}.`);
                            outputEmbedText += `**${permission}**: Failed to remove permission\n`
                        }
                        break;
                    default:
                        console.log(`Invalid operation was given for a permission change. Skipping over it.`);
                        outputEmbedText += `**${permissionChange}:** Invalid operation`;
                        break;
                }
            } else { // if the operation is reset
                console.log('Operation is reset.')
                try {
                    await timeout(300); // setting a short timeout to prevent abuse of Discord's API
                    const currentOverwrites = (textChannel as TextChannel).permissionOverwrites.get(role.id); // get the current permissions for the role
                    if (currentOverwrites) { // only act if the permission overwrites actually exist
                        await currentOverwrites.delete(); // attempt to delete permission overwrites
                    }
                    console.log(`Successfully reset permissions on role ${role.name}.`);
                    outputEmbedText += `**RESET PERMISSIONS**: Permissions reset successfully\n`
                } catch (e) {
                    console.log(`Failed to reset permissions on role ${role.name}.`);
                    outputEmbedText += `**RESET PERMISSIONS**: Failed to reset permissions\n`
                }
                break;
            }
        }

        try { // send output embed with information about the command's success
            outputEmbed.addField('\u200B', outputEmbedText); // add whatever text was accumulated throughout the command to the embed
            if (outputEmbedText !== '') { // check if there is actually any text to send the embed with
                outputEmbed.setDescription(`**Command executed by:** ${message.member!.user.tag}\n**Modified perimssions of role:** ${role.name}\n**Modified role's permissions in:** ${(textChannel as TextChannel).name}`);
                await message.channel.send(outputEmbed);
            }
            console.log(`Command changetextpermissions, started by ${message.member!.user.tag}, terminated successfully in ${message.guild}.`);
        } catch (e) {
            console.log(`There was an error sending an embed in the guild ${message.guild}! The error message is below:`);
            console.log(e);
        }
    }
}

export = command; // export the command to the main module

