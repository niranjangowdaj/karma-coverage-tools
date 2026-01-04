// Backend package karma config
module.exports = function(config) {
	config.set({
		basePath: 'packages/backend',
		frameworks: ['jasmine'],
		
		files: ['src/**/*.js', 'test/**/*.spec.js'],

		preprocessors: {
			'src/**/*.js': ['coverage']
		},

		coverageReporter: {
			dir: 'packages/backend/coverage',
			reporters: [
				{ type: 'lcov', subdir: 'lcov' },
				{ type: 'json', subdir: '.', file: 'coverage.json' }
			]
		},

		reporters: ['progress', 'coverage'],
		browsers: ['ChromeHeadless'],
		singleRun: true
	});
};

