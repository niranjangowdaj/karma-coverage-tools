// Custom named karma config
module.exports = function(config) {
	config.set({
		basePath: '',
		frameworks: ['jasmine'],
		
		files: ['app/**/*.js', 'test/**/*.spec.js'],

		preprocessors: {
			'app/**/*.js': ['coverage']
		},

		coverageReporter: {
			dir: 'reports/coverage',
			reporters: [
				{ type: 'cobertura', subdir: '.', file: 'cobertura.xml' }
			]
		},

		reporters: ['progress', 'coverage'],
		browsers: ['Chrome'],
		singleRun: false
	});
};

