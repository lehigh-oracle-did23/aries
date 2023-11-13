# aries - a Hyperledger Aries demo using the Oracle Blockchain Platform

## 🌱 Getting Started

### ‼️ Requirements

* [Node.js](https://nodejs.org/en/download/) `v18.x.x` >= `18.17.x` (One of the following versions of  must be installed to run **`npm`**)

### Installation

Each subdirectory in this repository is a standalone agent that should be run in a separate instance. The installation steps should be performed in one of these agent directories.

#### Yarn and Typescript

You can download & install **`yarn`** [directly](https://classic.yarnpkg.com/lang/en/docs/install) or from **`npm`** that comes in the **Node.js** version:

```bash
npm install --global yarn
```

**`yarn`** is used as the package manager in this project as it is more compatable than **`npm`** with the Askar module. 

You can download & install **`typescript`** [directly](https://www.typescriptlang.org/download) or from **`npm`**:

```bash
npm install -D typescript
```

#### Node Modules

All the moduels need to be laoded in with **`yarn`** from the `yarn.lock` file with:

```bash
yarn install
```

#### Node Version Managers

If you're looking to manage multiple versions of **`Node.js`** &/or **`npm`**, consider using a [node version manager](https://github.com/search?q=node+version+manager+archived%3Afalse&type=repositories&ref=advsearch)

### 🛠️ Build

This compiles the TypeScript in to JavaScript and moves it to the build folder.

```bash
npx tsc
```

### Usage

```bash
node build/index.js
```

Once you run the **`index.js`** script you will be instructed on how to operate the agent.

### Links & Resources

* [**Aries JavaScript Framework**](https://aries.js.org/) - Docs & how-tos for all things **Hyperledger Aries in JS**

