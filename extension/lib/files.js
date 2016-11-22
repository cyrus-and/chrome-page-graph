class Files {
    static fetch(path) {
        return new Promise((fulfill, reject) => {
            return fetch(path)
                .then(response => response.text())
                .then(fulfill)
                .catch(reject);
        });
    }
}
