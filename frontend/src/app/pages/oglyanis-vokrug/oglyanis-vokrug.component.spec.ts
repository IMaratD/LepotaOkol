import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OglyanisVokrugComponent } from './oglyanis-vokrug.component';

describe('OglyanisVokrugComponent', () => {
  let component: OglyanisVokrugComponent;
  let fixture: ComponentFixture<OglyanisVokrugComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OglyanisVokrugComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OglyanisVokrugComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
