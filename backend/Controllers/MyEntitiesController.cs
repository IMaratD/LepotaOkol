using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LepotaOkol.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MyEntitiesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MyEntitiesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/MyEntities
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MyEntity>>> GetMyEntities()
        {
            return await _context.MyEntities.ToListAsync();
        }

        // GET: api/MyEntities/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MyEntity>> GetMyEntity(int id)
        {
            var entity = await _context.MyEntities.FindAsync(id);

            if (entity == null)
                return NotFound();

            return entity;
        }

        // POST: api/MyEntities
        [HttpPost]
        public async Task<ActionResult<MyEntity>> PostMyEntity(MyEntity entity)
        {
            _context.MyEntities.Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMyEntity), new { id = entity.Id }, entity);
        }

        // PUT: api/MyEntities/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutMyEntity(int id, MyEntity entity)
        {
            if (id != entity.Id)
                return BadRequest();

            _context.Entry(entity).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.MyEntities.Any(e => e.Id == id))
                    return NotFound();

                throw;
            }

            return NoContent();
        }

        // DELETE: api/MyEntities/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMyEntity(int id)
        {
            var entity = await _context.MyEntities.FindAsync(id);
            if (entity == null)
                return NotFound();

            _context.MyEntities.Remove(entity);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
