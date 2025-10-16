const Hased = (): string => {
    const str = "qwertyuiopasdfghjklzxcvbnm"
    let result = ""

    while (result.length < str.length){
        const req = Math.floor(Math.random() * str.length)
        result += str[req]
    }

    return result
}

export default Hased;
