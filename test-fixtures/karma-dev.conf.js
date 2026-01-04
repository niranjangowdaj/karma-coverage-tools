// Development karma config - no coverage needed for fast dev feedback
module.exports = function(config) {
	config.set({
		basePath: '',
		frameworks: ['jasmine'],
		
		files: [
			'src/**/*.js',
			'test/**/*.spec.js'
		],

		preprocessors: {
			'src/**/*.js': ['babel']
		},

		browsers: ['Chrome'],
		
		autoWatch: true,
		singleRun: false,

		// No coverage reporter for dev - faster execution
		reporters: ['progress']
	});
};

