'use strict';

const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const plumber = require('gulp-plumber');
const filter = require('gulp-filter');
const gulpif = require('gulp-if');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sass = require('gulp-sass');

function onError(err) {
	console.warn(err);
}

function getBuild(dev) {
	var b = browserify({
		debug: true,
		entries: './zsr.js',
		standalone: "ZSR",
		transform: [
        	['babelify', {
        		'presets': ['es2015']
    		}]
		]
	});

	return b.bundle()
		.pipe(source('./zsr.js'))
		.pipe(buffer())
		.pipe(plumber({errorHandler: onError}))
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./build/'))
		.pipe(filter('*.js'))
		.pipe(uglify())
		.pipe(rename({ extname: '.min.js' }))
		.pipe(gulp.dest('build'));
}

gulp.task('default', function() {
	return getBuild(false);
});

gulp.task('jsDev', function() {
	return getBuild(true);
});

gulp.task('sass', function () {
  return gulp.src('./scss/*.scss')
    .pipe(plumber({errorHandler: onError}))
    .pipe(sass())
    .pipe(gulp.dest('./build'));
});
 
gulp.task('sass:watch', function () {
  gulp.watch('./scss/*.scss', ['sass']);
});


gulp.task('dev', ['sass', 'sass:watch'], function() {
	gulp.watch('./zsr.js', ['jsDev']);
	return getBuild(true);
});