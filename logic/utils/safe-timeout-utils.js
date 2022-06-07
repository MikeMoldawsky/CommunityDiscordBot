function safeSetTimeout(callback, ms){
	setTimeout(() => {
		try{
			callback();
		} catch (e) {
			console.log("Set Time Out - Failure. Uncaught exception", e)
		}
	}
	, ms
	)
}

module.exports = {
	safeSetTimeout
}