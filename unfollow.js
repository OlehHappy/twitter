/*!
 *  This script is demonstrating the new CasperJS Navigation Step Flow Control
 *  by adding new functions label() and goto().
 *
 *  As a sample, this 'unfollow.js' is unfollow followers in twitter account
 *  , by using infinite loop and conditional jump with
 *  new functions label() and goto() that current CasperJS does not have yet.
 */

//================================================================================

var casper = require('casper').create({
//    verbose: true,          // true or false
//    logLevel: 'debug',      // 'debug' 'info' 'warning' 'error'
    viewportSize: { width:1024, height:768 },
    pageSettings: { // It seems to need to emulate Chrome for getting pure href.
        userAgent: 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.79 Safari/537.1'
    }
});
var x = require('casper').selectXPath;
//================================================================================
//================================================================================
// Extending Casper functions for realizing label() and goto()
//
// Functions:
//   checkStep()   Revised original checkStep()
//   then()        Revised original then()
//   label()       New function for making empty new navigation step and affixing the new label on it.
//   goto()        New function for jumping to the labeled navigation step that is affixed by label()
//   dumpSteps()   New function for Dump Navigation Steps. This is very helpful as a flow control debugging tool.
//

var utils = require('utils');
var f = utils.format;

/**
 * Revised checkStep() function for realizing label() and goto()
 * Every revised points are commented.
 *
 * @param  Casper    self        A self reference
 * @param  function  onComplete  An options callback to apply on completion
 */
casper.checkStep = function checkStep(self, onComplete) {
    if (self.pendingWait || self.loadInProgress) {
        return;
    }
    self.current = self.step;                 // Added:  New Property.  self.current is current execution step pointer
    var step = self.steps[self.step++];
    if (utils.isFunction(step)) {
        self.runStep(step);
        step.executed = true;                 // Added:  This navigation step is executed already or not.
    } else {
        self.result.time = new Date().getTime() - self.startTime;
        self.log(f("Done %s steps in %dms", self.steps.length, self.result.time), "info");
        clearInterval(self.checker);
        self.emit('run.complete');
        if (utils.isFunction(onComplete)) {
            try {
                onComplete.call(self, self);
            } catch (err) {
                self.log("Could not complete final step: " + err, "error");
            }
        } else {
            // default behavior is to exit
            self.exit();
        }
    }
};


/**
 * Revised then() function for realizing label() and goto()
 * Every revised points are commented.
 *
 * @param  function  step  A function to be called as a step
 * @return Casper
 */
casper.then = function then(step) {
    if (!this.started) {
        throw new CasperError("Casper not started; please use Casper#start");
    }
    if (!utils.isFunction(step)) {
        throw new CasperError("You can only define a step as a function");
    }
    // check if casper is running
    if (this.checker === null) {
        // append step to the end of the queue
        step.level = 0;
        this.steps.push(step);
        step.executed = false;                 // Added:  New Property. This navigation step is executed already or not.
        this.emit('step.added', step);         // Moved:  from bottom
    } else {

      if( !this.steps[this.current].executed ) {  // Added:  Add step to this.steps only in the case of not being executed yet.
        // insert substep a level deeper
        try {
//          step.level = this.steps[this.step - 1].level + 1;   <=== Original
            step.level = this.steps[this.current].level + 1;   // Changed:  (this.step-1) is not always current navigation step
        } catch (e) {
            step.level = 0;
        }
        var insertIndex = this.step;
        while (this.steps[insertIndex] && step.level === this.steps[insertIndex].level) {
            insertIndex++;
        }
        this.steps.splice(insertIndex, 0, step);
        step.executed = false;                    // Added:  New Property. This navigation step is executed already or not.
        this.emit('step.added', step);            // Moved:  from bottom
      }                                           // Added:  End of if() that is added.

    }
//    this.emit('step.added', step);   // Move above. Because then() is not always adding step. only first execution time.
    return this;
};


/**
 * Adds a new navigation step by 'then()'  with naming label
 *
 * @param    String    labelname    Label name for naming execution step
 */
casper.label = function label( labelname ) {
  var step = new Function('"empty function for label: ' + labelname + ' "');   // make empty step
  step.label = labelname;                                 // Adds new property 'label' to the step for label naming
  this.then(step);                                        // Adds new step by then()
};

/**
 * Goto labeled navigation step
 *
 * @param    String    labelname    Label name for jumping navigation step
 */
casper.goto = function goto( labelname ) {
  for( var i=0; i<this.steps.length; i++ ){         // Search for label in steps array
      if( this.steps[i].label == labelname ) {      // found?
        this.step = i;                              // new step pointer is set
      }
  }
};
// End of Extending Casper functions for realizing label() and goto()
//================================================================================
//================================================================================




//================================================================================
//   Parameters (Global Variables)

var twitterUrl       = 'https://twitter.com/',
    login            = '',
    password         = '';

//================================================================================
//   CasperJS Navigation Step Description for Twitter unfollow followers

casper.start( twitterUrl );     // Navigation Step start and open Twitter Top Page

    casper.then(function() {                 // STEP:  Show Start Title
        this.echo( "<<<< Unfollow followers in Twitter >>>>", "INFO_BAR"  );
    });

    casper.then(function() {                 // STEP:  input login data
      this.sendKeys('#signin-email', login);
      this.sendKeys('#signin-password', password);
    });

    casper.then(function() {                 // STEP:  click sign in
      this.click('button.submit.btn.primary-btn.flex-table-btn.js-submit');
    });

    casper.then(function() {             // STEP:  Wait 3 seconds in order not to be considered SPAM
        this.wait( 10*1000 );
    });

casper.run( function() {   // The End of Navigation Step
  this.echo( "\n\n\n" );
  // this.dumpSteps( true );  // Dump Navigation Steps;  You can comment out this line.
  this.exit();
});

//================================================================================
