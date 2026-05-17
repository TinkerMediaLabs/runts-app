export default function TimeConversion (length : any) {
    let minutes = Math.floor(length / 60);
    let seconds = Math.floor((length % 60));
    return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
}