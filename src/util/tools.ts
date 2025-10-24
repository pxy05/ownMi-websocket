class logger {
    private userID: string | undefined;
    private printDate: boolean | undefined;
    private printUserID: boolean | undefined;
    private logMessages: boolean | undefined;

    constructor(userID?: string, printDate?: boolean, printUserID?: boolean, logMessages?: boolean) {
        if (userID) {
            this.userID = userID;
        }
        if (printDate) {
            this.printDate = printDate;
        }
        if (printUserID) {
            this.printUserID = printUserID;
        }
        if (logMessages !== undefined) {
            this.logMessages = logMessages;
        } else {
            this.logMessages = true; // Default to true for backward compatibility
        }
    }

    public getUserID() {
        return this.userID;
    }

    public getPrintDate() {
        return this.printDate;
    }

    public getPrintUserID() {
        return this.printUserID
    }

    public getLogMessages() {
        return this.logMessages
    }

    public setPrintDate(state: boolean) {
        this.printDate = state;
    }

    public setprintUserID(state: boolean) {
        this.printUserID = state;
    }

    public setUserID(newID: string) {
        this.userID = newID;
    }

    public setLogMessages(state: boolean) {
        this.logMessages = state;
    }

    public emit(message: string, userID?: string, printDate?: true, printUserID?: true): void {

        // Check if logging is enabled
        if (!this.logMessages) {
            return;
        }

        if ((!userID && !this.userID)) {
            throw new Error("MUST SET USERID EITHER THROUGH SETTER, CONSTRUCTOR, OR FUNCTION CALL");
        }

        let endMessage: string = ""
        const loggedUserID: string = userID ? userID : this.userID!;

        if (this.printDate || printDate) {
            endMessage = endMessage.concat(Date.now().toString());
            endMessage = this.addBarrier(endMessage)
        }

        endMessage = endMessage.concat(message);
        endMessage = this.addBarrier(endMessage)

        if (this.printUserID || printUserID) {
            endMessage = endMessage.concat(loggedUserID);

        }

        console.log(endMessage);
    }

    private addBarrier(s: string) {
        return s.concat(" | ")
    }

};

export default { logger };