# migration-AEM

- Use git to download this repository.
- After downloading from git run this command
  `npm i`
- To start, type this command into the terminal.
  `node index.js`
- When the prompt asks you to enter information for migration, enter both the folder path.
  eg:- `/users/admin/aem`
-

# CS Migration: Source

### Prerequisites

- basic understanding of CLI
- [Contentstack](https://app.contentstack.com/#!/login) account.
- Non-branch organization
- Node version 16v+

### Set Up Your App

This involves installing the csmig package. Follow the below steps for the same.

## Install the csmig package.

Configure your system with the package and proceed with the following steps. -

1. Go to the [Csmig ](https://www.npmjs.com/package/csmig)Npm package
2. Copy npm install -g csmig
3. Open a terminal and paste this line: npm install -g csmig
4. If npm install -g csmig does not work, then add sudo at the beginning and try to install this package like this:sudo npm install -g csmig
5. Once the package is installed globally, you must run this command in the terminal.

   - csmig run

     ![1682406913640](image/README/1682406913640.png)

6. You will get three region options. Select the region into which you want to import the data.

   - North America Region (NA)
   - Europe Region (EU)
   - Azure North America Region (Azure-NA)

     ![1682406692938](image/README/1682406692938.png)

7. After selecting the region you have to log in by adding your Contentstack email and password.

   ![1682407315910](image/README/1682407315910.png)

8. Once the login is successful. Select Contentstack from the options.

   ![1682406612276](image/README/1682406612276.png)

9. After selecting the Contentstack option select the Import from the local option

   ![1682406932063](image/README/1682406932063.png)

10. The **"aemMigrationData"** folder's path, which was created when the `node index.js` code was executed, must be entered because it checks to see if the path is accurate.
    e.g.:- /user/admin/aemMigrationData

    ![1682406675464](image/README/1682406675464.png)

11. Select yes or no if you want to import your data into a new stack or the existing stack.

    ![1682406896019](image/README/1682406896019.png)

12. Select the Organization from the list in which you want to import data

    ![1682406654819](image/README/1682406654819.png)

13. Enter the stack name if you have selected create new stack option

    ![1682406571475](image/README/1682406571475.png)

14. Write ‘N’ while entering to new master locale and continue

    ![1682406518782](image/README/1682406518782.png)

15. Enter the same path of **"aemMigrationData"** folder, once again and your import will start.
    e.g.:- /user/admin/aemMigrationData
