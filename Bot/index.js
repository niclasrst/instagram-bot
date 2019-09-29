class Bot {
	constructor() {
		this.firebase_db = require('./db');
		this.config = require('./config/puppeteer.json');
	}

	async initPuppeteer() {
		const puppeteer = require('puppeteer');

		this.browser = await puppeteer.launch({
			headless: this.config.settings.headless,
			args: ['--no-sandbox']
		});

		this.page = await this.browser.newPage();
		this.page.setViewport({ width: 1500, height: 764 });
	}

	async openInstagram() {
    await this.page.goto(this.config.base_url, { timeout: 60000 });
    await this.page.waitFor(2500);
    await this.page.click(this.config.selectors.home_to_login_button);
    await this.page.waitFor(2500);
    await this.page.click(this.config.selectors.username_field);
    await this.page.keyboard.type(this.config.username);
    await this.page.click(this.config.selectors.password_field);
    await this.page.keyboard.type(this.config.password);
    await this.page.click(this.config.selectors.login_button);
    await this.page.waitForNavigation();
    await this.page.click(this.config.selectors.not_now_button);
	}

	async gotoHashtag() {		
		const shuffle = require('shuffle-array');
		let hashtags = shuffle(this.config.hashtags);

		for (let i = 0; i < hashtags.length; i++) {
			console.log(`[*] Current Hashtag: '#${hashtags[i]}'`);

			await this.page.goto(`${this.config.base_url}/explore/tags/${hashtags[i]}/?hl=en`);
			await this.likePostFollow(this.config.selectors.hashtags_base_class, this.page);
		}
	}

	async likePostFollow(parentClass, page) {
    for (let r = 1; r < 4; r++) {
			for (let c = 1; c < 4; c++) {
				let br = false;
				
				await page.click(`${parentClass} > div > div > .Nnq7C:nth-child(${r}) > .v1Nh3:nth-child(${c}) > a`)
					.catch((e) => {
						console.log(e.message);
						br = true;
					});
				
				await page.waitFor(2250 + Math.floor(Math.random() * 250));
				if (br) continue;

				let notLikedYet = await page.$(this.config.selectors.post_heart_grey);
				let username = await page.evaluate(x => {
					let element = document.querySelector(x);
					return Promise.resolve(element ? element.innerHTML : '');
				}, this.config.selectors.post_username);
				console.log(`[*] Processing a post of: ${username}`);

				if (notLikedYet !== null && Math.random() < this.config.settings.like_ratio) {
					await page.click(this.config.selectors.post_like_button);
					await page.waitFor(10000 + Math.floor(Math.random() * 5000));
				}

				let isArchivedUser = null;
				await this.firebase_db.inHistory(username).then(data => isArchivedUser = data)
					.catch(() => isArchivedUser = false);

				let followStatus = await page.evaluate(x => {
					let element = document.querySelector(x);
					return Promise.resolve(element ? element.innerHTML : '');
				}, this.config.selectors.post_follow_link);

				console.log(`[*] Status (following) : ${followStatus}`);
				if (followStatus === 'Follow' && !isArchivedUser) {
					await this.firebase_db.addFollowing(username).then(() => {
						return page.click(this.config.selectors.post_follow_link);
					}).then(() => {
						console.log(`[+] Now following: ${username}`);
						return page.waitFor(10000 + Math.floor(Math.random() * 5000));
					}).catch((e) => {
						console.log(`[-] Already following: ${username}`);
						console.log(`[-] Maybe an error occured ${username} : ${e.message}`);
					});
				}

				await page.click(this.config.selectors.post_close_button)
					.catch((e) => console.log(`[-] An error occured closing the post:\n${e.message}`));
				await page.waitFor(2250 + Math.floor(Math.random() * 250));
			}
    }
	}

	async unFollowUsers() {
    let date_range = new Date().getTime() - (this.config.settings.unfollow_after_days * 86400000);

    let following = await this.firebase_db.getFollowings();
    let users_to_unfollow = [];
    if (following) {
			const all_users = Object.keys(following);
			users_to_unfollow = all_users.filter(user => following[user].added < date_range);
    }

    if (users_to_unfollow.length) {
			for (let n = 0; n < users_to_unfollow.length; n++) {
				let user = users_to_unfollow[n];
				await this.page.goto(`${this.config.base_url}/${user}/?hl=en`);
				await this.page.waitFor(1500 + Math.floor(Math.random() * 500));

				let followStatus = await this.page.evaluate(x => {
					let element = document.querySelector(x);
					return Promise.resolve(element ? element.innerHTML : '');
				}, this.config.selectors.user_unfollow_button);

				if (followStatus === 'Following') {
					console.log(`[+] Unfollowing user: ${user}`);
					await this.page.click(this.config.selectors.user_unfollow_button);
					await this.page.waitFor(1000);
					await this.page.click(this.config.selectors.user_unfollow_confirm_button);
					await this.page.waitFor(20000 + Math.floor(Math.random() * 5000));
					await this.firebase_db.unFollow(user);
				} else {
					this.firebase_db.unFollow(user);
				}
			}
    }
	}

	async closeBrowser(){
		await this.browser.close();
	}
}

module.exports = Bot;