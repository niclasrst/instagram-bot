const Bot = require('./Bot');
const config = require('./Bot/config/puppeteer');

const run = async () => {
	const bot = new Bot();
	const startTime = Date();
	
	await bot.initPuppeteer().then(() => console.log('[+] Puppeteer successfully initialized.'));
	await bot.openInstagram().then(() => console.log('[+] Successfully opened instagram.'));
	await bot.gotoHashtag().then(() => console.log('[+] Successfully opened hashtag page.\n'));
	await bot.unFollowUsers();
	await bot.closeBrowser().then(() => console.log('[+] Browser closed successfully.'));
	
	const endTime = Date();
	console.log(`\n[*] start: ${startTime} - end: ${endTime}`);
}

run().catch( e => console.log(e.message));
setInterval(run, config.settings.run_every_x_hours * 3600000);