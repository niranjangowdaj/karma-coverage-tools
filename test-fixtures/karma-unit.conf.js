// Unit test karma config
module.exports = function(config) {
	config.set({
		basePath: '',
		frameworks: ['jasmine'],
		
		files: ['src/**/*.js', 'test/unit/**/*.spec.js'],

		preprocessors: {
			'src/**/*.js': ['coverage']
		},

		coverageReporter: {
			dir: 'coverage/unit',
			reporters: [
				{ type: 'html', subdir: 'html' },
				{ type: 'lcov', subdir: 'lcov' }
			]
		},

		reporters: ['progress', 'coverage'],
		browsers: ['ChromeHeadless'],
		singleRun: true
	});
};

