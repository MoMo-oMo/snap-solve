describe('Home page', () => {
  it('redirects to /home and shows both action cards', () => {
    cy.visit('/')
    cy.location('pathname').should('eq', '/home')
    cy.contains('Scan a Problem')
    cy.contains('Check My Work')
  })

  it('navigates to the Solve page', () => {
    cy.visit('/home')
    cy.contains('Scan a Problem').click()
    cy.location('pathname').should('eq', '/solve')
  })
})
