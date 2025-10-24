import tools from "../src/util/tools";

// Mock console.log to capture output
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

beforeEach(() => {
    consoleOutput = [];
    console.log = (...args: any[]) => {
        consoleOutput.push(args.join(' '));
    };
});

afterEach(() => {
    console.log = originalConsoleLog;
});

describe('Logger Class Tests', () => {
    describe('Constructor and Initialization', () => {
    test('should initialize with all parameters', () => {
        const logger = new tools.logger("user123", true, true, true);
        
        expect(logger.getUserID()).toBe("user123");
        expect(logger.getPrintDate()).toBe(true);
        expect(logger.getPrintUserID()).toBe(true);
        expect(logger.getLogMessages()).toBe(true);
    });

        test('should initialize with partial parameters', () => {
            const logger = new tools.logger("user456", true);
            
            expect(logger.getUserID()).toBe("user456");
            expect(logger.getPrintDate()).toBe(true);
            expect(logger.getPrintUserID()).toBeUndefined();
        });

        test('should initialize with no parameters', () => {
            const logger = new tools.logger();
            
            expect(logger.getUserID()).toBeUndefined();
            expect(logger.getPrintDate()).toBeUndefined();
            expect(logger.getPrintUserID()).toBeUndefined();
        });
    });

    describe('Setter Methods', () => {
        test('should set userID using setUserID', () => {
            const logger = new tools.logger();
            logger.setUserID("newUser123");
            
            expect(logger.getUserID()).toBe("newUser123");
        });

        test('should set printDate using setPrintDate', () => {
            const logger = new tools.logger();
            logger.setPrintDate(true);
            
            expect(logger.getPrintDate()).toBe(true);
        });

    test('should set printUserID using setprintUserID', () => {
        const logger = new tools.logger();
        logger.setprintUserID(true);
        
        expect(logger.getPrintUserID()).toBe(true);
    });

    test('should set logMessages using setLogMessages', () => {
        const logger = new tools.logger();
        logger.setLogMessages(false);
        
        expect(logger.getLogMessages()).toBe(false);
    });

    test('should not emit messages when logMessages is false', () => {
        const logger = new tools.logger("user123", false, true, false);
        logger.emit("Test message");
        
        // Should not produce any console output
        expect(consoleOutput).toHaveLength(0);
    });

    test('should emit messages when logMessages is true', () => {
        const logger = new tools.logger("user123", false, true, true);
        logger.emit("Test message");
        
        // Should produce console output
        expect(consoleOutput).toHaveLength(1);
        expect(consoleOutput[0]).toContain("Test message");
    });
    });

    describe('Emit Method - Basic Functionality', () => {
        test('should emit message with userID from constructor', () => {
            const logger = new tools.logger("user123", false, true);
            logger.emit("Test message");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("Test message");
            expect(consoleOutput[0]).toContain("user123");
        });

        test('should emit message with userID from emit call', () => {
            const logger = new tools.logger("defaultUser", false, true);
            logger.emit("Test message", "overrideUser");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("Test message");
            expect(consoleOutput[0]).toContain("overrideUser");
        });

        test('should throw error when no userID is available', () => {
            const logger = new tools.logger();
            
            expect(() => {
                logger.emit("Test message");
            }).toThrow("MUST SET USERID EITHER THROUGH SETTER, CONSTRUCTOR, OR FUNCTION CALL");
        });
    });

    describe('Emit Method - Date Printing', () => {
        test('should print date when printDate is true in constructor', () => {
            const logger = new tools.logger("user123", true, false);
            logger.emit("Test message");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("Test message");
            expect(consoleOutput[0]).toMatch(/\d+/); // Should contain timestamp
        });

        test('should print date when printDate is true in emit call', () => {
            const logger = new tools.logger("user123", false, false);
            logger.emit("Test message", undefined, true);
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("Test message");
            expect(consoleOutput[0]).toMatch(/\d+/); // Should contain timestamp
        });

        test('should not print date when printDate is false', () => {
            const logger = new tools.logger("user123", false, false);
            logger.emit("Test message");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toBe("Test message | "); // No timestamp, no userID
        });
    });

    describe('Emit Method - UserID Printing', () => {
        test('should print userID when printUserID is true in constructor', () => {
            const logger = new tools.logger("user123", false, true);
            logger.emit("Test message");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("Test message");
            expect(consoleOutput[0]).toContain("user123");
        });

        test('should print userID when printUserID is true in emit call', () => {
            const logger = new tools.logger("user123", false, false);
            logger.emit("Test message", undefined, undefined, true);
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("Test message");
            expect(consoleOutput[0]).toContain("user123");
        });

        test('should not print userID when printUserID is false', () => {
            const logger = new tools.logger("user123", false, false);
            logger.emit("Test message");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toBe("Test message | "); // No userID
        });
    });

    describe('Emit Method - Message Formatting', () => {
        test('should format message with date and userID', () => {
            const logger = new tools.logger("user123", true, true);
            logger.emit("Test message");
            
            expect(consoleOutput).toHaveLength(1);
            const output = consoleOutput[0];
            expect(output).toContain("Test message");
            expect(output).toContain("user123");
            expect(output).toMatch(/\d+/); // Should contain timestamp
            expect(output).toMatch(/\|/); // Should contain barriers
        });

        test('should handle empty message', () => {
            const logger = new tools.logger("user123", false, true);
            logger.emit("");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("user123");
        });

        test('should handle special characters in message', () => {
            const logger = new tools.logger("user123", false, true);
            logger.emit("Message with special chars: @#$%^&*()");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("@#$%^&*()");
            expect(consoleOutput[0]).toContain("user123");
        });

        test('should handle long message', () => {
            const logger = new tools.logger("user123", false, true);
            const longMessage = "This is a very long message that contains multiple words and should be handled properly by the logger function without any issues";
            logger.emit(longMessage);
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain(longMessage);
            expect(consoleOutput[0]).toContain("user123");
        });
    });

    describe('Multiple Messages', () => {
        test('should log multiple messages correctly', () => {
            const logger = new tools.logger("user123", false, true);
            logger.emit("First message");
            logger.emit("Second message");
            
            expect(consoleOutput).toHaveLength(2);
            expect(consoleOutput[0]).toContain("First message");
            expect(consoleOutput[0]).toContain("user123");
            expect(consoleOutput[1]).toContain("Second message");
            expect(consoleOutput[1]).toContain("user123");
        });
    });

    describe('Edge Cases', () => {
        test('should work with userID set via setter after construction', () => {
            const logger = new tools.logger(undefined, false, true);
            logger.setUserID("setterUser");
            logger.emit("Test message");
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("Test message");
            expect(consoleOutput[0]).toContain("setterUser");
        });

        test('should override constructor settings with emit parameters', () => {
            const logger = new tools.logger("constructorUser", false, false);
            logger.emit("Test message", "emitUser", true, true);
            
            expect(consoleOutput).toHaveLength(1);
            expect(consoleOutput[0]).toContain("Test message");
            expect(consoleOutput[0]).toContain("emitUser");
            expect(consoleOutput[0]).toMatch(/\d+/); // Should contain timestamp
        });
    });
});