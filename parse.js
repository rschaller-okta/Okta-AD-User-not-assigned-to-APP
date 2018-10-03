var fs = require('fs')
var request = require("request");
var Promise = require('promise');
 
main()

async function main() {
	if (process.argv[2] && 
		process.argv[2].includes("okta") &&
		process.argv[3] &&
		process.argv[4]
		) {

		var api = ""
		var appId = process.argv[4]

		api = "users"
		allUsers = await loopUsers("newUsers", api)
		
		api = `apps/${appId}/users?eventType="system.import"`
		hrAppList = await loopUsers("hrAppList", api)

		detectUserNotMastered("match.csv", allUsers, hrAppList)			
	}
	else {
		console.log("Usage: okta_check [Okta Instance URL] [Okta API Token] [Okta Target APP ID]")
		console.log("Example: okta_check https://cryan.oktapreview.com ljj1jl2j312j3lkj1 fjk123jk1l4j11")
	}
	
}

async function loopUsers(fileName, api) {
	console.log(`Getting ${fileName}`)

	var domain = process.argv[2]
	var token = process.argv[3]
	

	var url = `https://${domain}/api/v1/${api}`

	var options = { method: 'GET',
	  url: `${url}`,
	  qs: { limit: '50' },
	  headers: 
	   { 
	     'Cache-Control': 'no-cache',
	     Authorization: `SSWS ${token}`,
	     'Content-Type': 'application/json',
	     Accept: 'application/json' } };

	var fileSeed = ""
	writeFile(fileName,fileSeed)
	
	await appendToFile(fileName, "[")	
	
	
	let nextLink = await getUsers(options, fileName)
	while(nextLink) {
		// console.log(`next link: ${nextLink}`)
		options.url = nextLink
		nextLink = await getUsers(options, fileName)		
	}
	
	appendToFile(fileName, "]")	

	resultList = JSON.parse(fs.readFileSync(fileName, 'utf8'))
	console.log(JSON.parse(resultList.length))
	return resultList;

}

function getUsers(options, fileName) {
	return new Promise( function(resolve, reject) {
		request(options, function (error, response, body) {
		  if (error) {
		  	reject(error)
		  	// throw new Error(error)
		  }	
		  // console.log(body)
		  resp_json = response.headers
		  userResult = JSON.parse(body)

		  for(var i = 0; i < userResult.length; i++) {
		  	appendToFile(fileName, JSON.stringify(userResult[i]))
		  	if(i < (userResult.length - 1)) appendToFile(fileName, ",")	
		  }
		  
		  next_link = null
		  if(resp_json.link.split(",")[1]) {
		  	appendToFile(fileName, ",")	
		  	strip_pattern = /(<|>| )/g
			next_link = resp_json.link.split(",")[1].split(";")[0].replace(strip_pattern, "")
		  }	
		  resolve(next_link)	  
		})
	})	
}

function appendToFile(fileName, obj) {
	fs.appendFileSync(fileName, obj);
}

async function detectUserNotMastered(fileName, allUsers, hrAppList)  {
	
	await writeFile(fileName,"")

	var fileSeed = "Users Email\n"

	appendToFile(fileName, fileSeed)	

	var entryWritten = false

	for (var i = 0; i < allUsers.length; i++) {
		hit = null

		for (var j = 0; j < hrAppList.length; j++) {
			if (allUsers[i].id === hrAppList[j].id) {
				hit = allUsers[i]
			}
		}

		if(hit === null && allUsers[i].credentials.provider.type === "ACTIVE_DIRECTORY") {
			if(entryWritten) { 
				appendToFile(fileName, "\n")	
			}
			appendToFile(fileName, allUsers[i].profile.login)	
			entryWritten = true			
		}
	}
}

function writeFile(fileName, obj) {
	var fs = require('fs');
	
	fs.writeFile(fileName, obj, function(err) {
	    if(err) {
	        return console.log(err)
	    }

	    console.log(`The file: ${fileName} was created!`)
	})
}










