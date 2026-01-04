// Shared library karma config
module.exports = function(config) {
	config.set({
		basePath: 'packages/shared',
		frameworks: ['jasmine'],
		
		files: ['src/**/*.js', 'test/**/*.spec.js'],

		preprocessors: {
			'src/**/*.js': ['coverage']
		},

		coverageReporter: {
			dir: 'packages/shared/coverage',
			reporters: [
				{ type: 'html', subdir: 'html' },
				{ type: 'lcov', subdir: 'lcov' },
				{ type: 'cobertura', subdir: '.', file: 'cobertura.xml' }
			]
		},

		reporters: ['progress', 'coverage'],
		browsers: ['ChromeHeadless'],
		singleRun: true
	});
};

